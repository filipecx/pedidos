import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, webhookInbox, eventsOutbox, paymentEvents } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyWebhookSignature } from '@/server/modules/payments/openpix';
import { openpixWebhookPayloadSchema } from '@/server/modules/payments/openpix-schema';

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
      console.warn('[OpenPix Webhook] Assinatura Inválida!');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const json = JSON.parse(rawBody);
    
    // ACL: Valida formato base com Zod (Não processamos lixo)
    const parsed = openpixWebhookPayloadSchema.safeParse(json);
    if (!parsed.success) {
      console.error('[OpenPix Webhook] Payload fora do formato esperado', parsed.error);
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const payload = parsed.data;
    
    // Identificador único do evento para Inbox (Desduplicação).
    const pspEventId = json.charge?.correlationID 
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
          const correlationId = payload.charge.correlationID;

          // Buscar o pagamento original
          // (Apenas para fins de leitura, safe fazer dentro da tx)
          const paymentRecord = await tx.query.payments.findFirst({
            where: eq(payments.idempotencyKey, correlationId)
          });

          if (!paymentRecord) {
            console.error(`[Webhook] Pagamento não encontrado para correlationID: ${correlationId}`);
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
              console.warn(`[Webhook] Concorrência evitada: O pagamento ${paymentRecord.id} já teve seu status alterado.`);
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
            
            console.log(`[Webhook] Pagamento ${paymentRecord.id} (Order: ${paymentRecord.orderId}) confirmado com sucesso.`);
          }
        }
      });
    } catch (e: any) {
      // 23505 = Unique Violation no Postgres (O evento já foi processado no Inbox em outra ocasião)
      if (e.code === '23505') {
        console.log(`[Webhook] Evento duplicado ignorado. pspEventId: ${pspEventId}`);
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
    console.error('[OpenPix Webhook] Erro Interno', error);
    // Damos 500 para o PSP tentar de novo mais tarde em caso de falha transitória do nosso lado
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
