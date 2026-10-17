import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, webhookInbox, eventsOutbox, paymentEvents, orders, stores } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { verifyWebhookSignature } from '@/server/modules/payments/openpix';
import { openpixWebhookPayloadSchema } from '@/server/modules/payments/openpix-schema';
import { redis } from '@/lib/redis';
import { createChildLogger } from '@/lib/logger';
import { cancelOrderAndRestoreStock } from '@/server/modules/orders/stock-services';

const log = createChildLogger('webhook:openpix');

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    // A OpenPix normalmente envia a assinatura em cabeçalhos (authorization ou webhook-signature)
    // Vamos checar ambos (A doc v1 envia no header Authorization, ou x-openpix-signature)
    const signature = req.headers.get('authorization') || req.headers.get('x-openpix-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Validação Anti-Fraude
    if (!verifyWebhookSignature(signature, rawBody)) {
      log.warn({ signature }, 'Assinatura inválida no webhook OpenPix');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const json = JSON.parse(rawBody);
    
    // ACL: Valida formato base com Zod (Não processamos lixo)
    const parsed = openpixWebhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      log.error({ error: parsed.error }, 'Payload fora do formato esperado no webhook OpenPix');
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const payload = parsed.data;
    
    // Identificador único do evento para Inbox (Desduplicação).
    const pspEventId = payload.charge?.correlationID 
      ? `${payload.event}_${payload.charge.correlationID}` 
      : crypto.randomUUID(); 

    // PROCESSAMENTO ATÔMICO (TUDO OU NADA)
    try {
      await db.transaction(async (tx) => {
        // 1. INBOX PATTERN
        // Se o evento já existir, isso gerará o erro 23505, abortando a transação inteira.
        // O bloco catch abaixo cuidará de retornar 200 para a OpenPix.
        await tx.insert(webhookInbox).values({
          pspEventId,
          provider: 'OPENPIX',
          eventType: payload.event,
          payload: json,
        });

        // 2. PROCESSAR REGRA DE NEGÓCIO COM BASE NO EVENTO
        if (payload.event === 'OPENPIX:CHARGE_COMPLETED') {
          if (!payload.charge) {
             log.warn({ event: payload.event }, 'Evento CHARGE_COMPLETED recebido sem objeto charge');
             return; // Aborta silenciosamente e devolve o 200 OK lá no final
          }
          const correlationId = payload.charge.correlationID;

          // Buscar o pagamento original
          // (Apenas para fins de leitura, safe fazer dentro da tx)
          const paymentRecord = await tx.query.payments.findFirst({
            where: eq(payments.idempotencyKey, correlationId)
          });

          if (!paymentRecord) {
            log.error({ correlationId }, 'Pagamento não encontrado para correlationID no webhook OpenPix');
            // Usamos uma exceção customizada para sinalizar o 404
            throw new Error('PAYMENT_NOT_FOUND');
          }

          if (paymentRecord.status !== 'PAID') {
            // Atualiza status p/ PAGO com Controle de Concorrência Otimista
            const updated = await tx.update(payments)
              .set({ status: 'PAID', updatedAt: new Date() })
              .where(
                and(
                  eq(payments.id, paymentRecord.id),
                  eq(payments.status, paymentRecord.status)
                )
              )
              .returning({ id: payments.id });

            // Se a linha não foi atualizada (length === 0), significa que outra transação "ganhou"
            if (updated.length === 0) {
              log.warn({ paymentId: paymentRecord.id, correlationId }, 'Concorrência evitada: O pagamento já teve seu status alterado');
              return; 
            }

            // Histórico apêndice p/ rastreabilidade
            await tx.insert(paymentEvents).values({
              paymentId: paymentRecord.id,
              status: 'PAID',
              payload: json,
            });

            // OUTBOX PATTERN: Publicar na tabela para o BullMQ pegar depois e disparar p/ Order Service
            await tx.insert(eventsOutbox).values({
              aggregateType: 'PAYMENT',
              aggregateId: paymentRecord.id,
              eventType: 'PAYMENT_CONFIRMED',
              payload: { orderId: paymentRecord.orderId, paymentId: paymentRecord.id },
              status: 'PENDING',
            });
            
            // Buscar o pedido associado para pegar o valor total e o storeId
            const orderRecord = await tx.query.orders.findFirst({
              where: eq(orders.id, paymentRecord.orderId)
            });

            if (orderRecord) {
              await tx.update(orders)
                .set({ status: 'PREPARING', updatedAt: new Date() })
                .where(eq(orders.id, orderRecord.id));

              await tx.update(stores)
                .set({
                  ordersCount: sql`${stores.ordersCount} + 1`,
                  totalSalesCents: sql`${stores.totalSalesCents} + ${orderRecord.totalCents}`
                })
                .where(eq(stores.id, orderRecord.storeId));

              // Dispara SSE para o lojista com o tipo de carrinho
              await redis.publish(
                `store-orders:${orderRecord.storeId}`, 
                JSON.stringify({ 
                  type: "REFRESH",
                  orderId: orderRecord.id,
                  cartType: orderRecord.cartType,
                })
              ).catch((err) => {
                log.error({ err, storeId: orderRecord.storeId }, 'Falha ao publicar evento SSE no Redis para lojista');
              });

              // Dispara SSE para o cliente que está na tela de pagamento
              await redis.publish(
                `order:${orderRecord.id}:events`,
                JSON.stringify({
                  event: "PAYMENT_CONFIRMED",
                  orderId: orderRecord.id,
                  status: "PREPARING",
                })
              ).catch((err) => {
                log.error({ err, orderId: orderRecord.id }, 'Falha ao publicar evento SSE no Redis para cliente');
              });
            }

            log.info({
              paymentId: paymentRecord.id,
              orderId: paymentRecord.orderId,
              correlationId,
              storeId: orderRecord?.storeId,
            }, 'Pagamento confirmado e pedido atualizado para PREPARING');
          }
        } else if (
          payload.event === 'OPENPIX:CHARGE_REFUNDED' || 
          payload.event === 'PIX_TRANSACTION_REFUND_SENT_CONFIRMED' ||
          payload.event === 'OPENPIX:TRANSACTION_REFUND_RECEIVED'
        ) {
          const correlationId = payload.charge?.correlationID || payload.refund?.correlationID || (payload as any).pix?.charge?.correlationID;
          if (!correlationId) {
            log.warn({ event: payload.event }, 'Evento CHARGE_REFUNDED recebido sem correlationID');
            return;
          }

          const paymentRecord = await tx.query.payments.findFirst({
            where: eq(payments.idempotencyKey, correlationId)
          });

          if (!paymentRecord) {
            log.warn({ correlationId }, 'Pagamento não encontrado para estorno no webhook OpenPix');
            return;
          }

          if (paymentRecord.status !== 'REFUNDED') {
            await tx.update(payments)
              .set({ status: 'REFUNDED', updatedAt: new Date() })
              .where(eq(payments.id, paymentRecord.id));

            await tx.insert(paymentEvents).values({
              paymentId: paymentRecord.id,
              status: 'REFUNDED',
              payload: json,
            });

            // Restaura o estoque de produtos e marca pedido como CANCELED
            await cancelOrderAndRestoreStock(paymentRecord.orderId, tx);

            // Reverte métricas da loja
            const orderRecord = await tx.query.orders.findFirst({
              where: eq(orders.id, paymentRecord.orderId)
            });

            if (orderRecord) {
              await tx.update(stores)
                .set({
                  ordersCount: sql`GREATEST(0, ${stores.ordersCount} - 1)`,
                  totalSalesCents: sql`GREATEST(0, ${stores.totalSalesCents} - ${orderRecord.totalCents})`,
                })
                .where(eq(stores.id, orderRecord.storeId));

              // Dispara SSE para lojista
              await redis.publish(
                `store-orders:${orderRecord.storeId}`, 
                JSON.stringify({ type: "REFRESH", orderId: orderRecord.id })
              ).catch(console.error);

              // Dispara SSE para o cliente
              await redis.publish(
                `order:${orderRecord.id}:events`,
                JSON.stringify({
                  event: "ORDER_REFUNDED",
                  orderId: orderRecord.id,
                  status: "CANCELED",
                })
              ).catch(console.error);
            }

            log.info({
              paymentId: paymentRecord.id,
              orderId: paymentRecord.orderId,
              correlationId,
            }, 'Estorno confirmado via webhook e pedido cancelado');
          }
        }
      });
    } catch (e: any) {
      // 23505 = Unique Violation no Postgres (O evento já foi processado no Inbox em outra ocasião)
      if (e.code === '23505') {
        log.info({ pspEventId }, 'Evento duplicado ignorado pelo Inbox Pattern');
        // Retornamos 200 pro PSP parar de tentar
        return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
      }

      if (e.message === 'PAYMENT_NOT_FOUND') {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      throw e; // Repassa para o catch geral abaixo que retorna 500
    }

    // Só devolvemos 200 se a transação inteira passar com sucesso.
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    log.error({ error: error?.message || error, stack: error?.stack }, 'Erro interno no processamento do webhook OpenPix');
    // Damos 500 para o PSP tentar de novo mais tarde em caso de falha transitória do nosso lado
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
