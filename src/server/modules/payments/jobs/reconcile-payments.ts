import { db } from '@/db';
import { payments, eventsOutbox, paymentEvents } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { getOpenPixChargeByCorrelationId } from '../openpix';
import { cancelOrderAndRestoreStock } from '@/server/modules/orders/stock-services';

/**
 * Job de Reconciliação (Self-Healing)
 * Procura pagamentos travados em WAITING_PAYMENT e verifica seu status real no PSP.
 */
export async function reconcilePayments() {
  // Pega pagamentos que estão aguardando há mais de 10 minutos
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const stalePayments = await db.query.payments.findMany({
    where: and(
      eq(payments.status, 'WAITING_PAYMENT'),
      lt(payments.createdAt, tenMinutesAgo)
    ),
    limit: 100, // Processa em lotes para não sobrecarregar
  });

  if (stalePayments.length === 0) return { reconciled: 0 };

  let reconciledCount = 0;

  for (const payment of stalePayments) {
    try {
      // Vai na OpenPix perguntar a verdade sobre a cobrança
      const charge = await getOpenPixChargeByCorrelationId(payment.idempotencyKey);
      
      if (!charge) continue;

      if (charge.status === 'COMPLETED' || charge.status === 'EXPIRED') {
        const newStatus = charge.status === 'COMPLETED' ? 'PAID' : 'EXPIRED';
        const eventType = charge.status === 'COMPLETED' ? 'PAYMENT_CONFIRMED' : 'PAYMENT_EXPIRED';

        // Executa a transação de "Self-Healing"
        await db.transaction(async (tx) => {
          await tx.update(payments)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(payments.id, payment.id));

          await tx.insert(paymentEvents).values({
            paymentId: payment.id,
            status: newStatus,
            payload: { source: 'RECONCILIATION_JOB', charge },
          });

          await tx.insert(eventsOutbox).values({
            aggregateType: 'PAYMENT',
            aggregateId: payment.id,
            eventType: eventType,
            payload: { orderId: payment.orderId, paymentId: payment.id },
            status: 'PENDING',
          });

          // Se a cobrança expirou, cancela o pedido e restaura o estoque atomicamente
          if (newStatus === 'EXPIRED') {
            await cancelOrderAndRestoreStock(payment.orderId, tx);
          }
        });

        console.log(`[Reconciliação] Pagamento ${payment.id} atualizado para ${newStatus}`);
        reconciledCount++;
      }
    } catch (error) {
      console.error(`[Reconciliação] Erro ao reconciliar pagamento ${payment.id}:`, error);
    }
  }

  return { reconciled: reconciledCount };
}
