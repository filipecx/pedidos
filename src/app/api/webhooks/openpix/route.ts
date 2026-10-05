import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payments, webhookInbox, eventsOutbox, paymentEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
    // Caso a OpenPix não mande um webhookId nativo, inferimos por correlationID + evento.
    const pspEventId = json.charge?.correlationID 
      ? `${payload.event}_${payload.charge.correlationID}` 
      : crypto.randomUUID(); 

    // 1. INBOX PATTERN
    try {
      await db.insert(webhookInbox).values({
        pspEventId,
        provider: 'OPENPIX',
        eventType: payload.event,
        payload: json,
      });
    } catch (e: any) {
      // 23505 = Unique Violation no Postgres (O evento já foi processado)
      if (e.code === '23505') {
        console.log(`[Webhook] Evento duplicado ignorado. pspEventId: ${pspEventId}`);
        // Retornamos 200 pro PSP parar de encher o saco
        return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
      }
      throw e;
    }

    // 2. PROCESSAR TRANSAÇÃO COM BASE NO EVENTO
    // (Poderíamos usar um switch, por enquanto focamos no de pagamento concluído)
    if (payload.event === 'OPENPIX:CHARGE_COMPLETED') {
      const correlationId = payload.charge.correlationID;

      // Buscar o pagamento original
      const paymentRecord = await db.query.payments.findFirst({
        where: eq(payments.idempotencyKey, correlationId)
      });

      if (!paymentRecord) {
        console.error(`[Webhook] Pagamento não encontrado para correlationID: ${correlationId}`);
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (paymentRecord.status !== 'PAID') {
        // TRANSAÇÃO ACID: Se o banco cair no meio, nada acontece. Se passar, tudo está garantido.
        await db.transaction(async (tx) => {
          // Atualiza status p/ PAGO
          await tx.update(payments)
            .set({ status: 'PAID', updatedAt: new Date() })
            .where(eq(payments.id, paymentRecord.id));

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
        });

        console.log(`[Webhook] Pagamento ${paymentRecord.id} (Order: ${paymentRecord.orderId}) confirmado com sucesso.`);
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[OpenPix Webhook] Erro Interno', error);
    // Damos 500 para o PSP tentar de novo mais tarde em caso de falha transitória do nosso lado
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
