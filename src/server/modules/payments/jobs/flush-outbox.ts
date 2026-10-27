import { db } from '@/db';
import { eventsOutbox, orders } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Função de domínio que consome eventos do banco (Outbox Pattern)
 * e aplica os efeitos colaterais nos outros serviços/módulos,
 * garantindo a entrega eventual (Eventual Consistency).
 */
import { redis } from '@/lib/redis';

export async function flushOutbox() {
  const pendingEvents = await db.query.eventsOutbox.findMany({
    where: eq(eventsOutbox.status, 'PENDING'),
    limit: 50,
  });

  if (pendingEvents.length === 0) return { processed: 0 };

  let processedCount = 0;

  for (const event of pendingEvents) {
    try {
      // Mapeamento de Eventos (Event Router)
      switch (event.eventType) {
        case 'PAYMENT_CONFIRMED': {
          const payload = event.payload as { orderId: string, paymentId: string };
          
          // 1. Atualiza o status do pedido para 'PREPARING' (Preparação)
          const [updatedOrder] = await db.update(orders)
            .set({ status: 'PREPARING', updatedAt: new Date() })
            .where(eq(orders.id, payload.orderId))
            .returning({ storeId: orders.storeId });
            
          // 2. Redis Pub/Sub: Dispara aviso em tempo real (SSE)
          if (updatedOrder) {
            const eventMsg = JSON.stringify({ action: 'PAYMENT_CONFIRMED', orderId: payload.orderId });
            
            // Avisa a tela do Comprador (Aguardando Pagamento)
            await redis.publish(`order:${payload.orderId}:events`, eventMsg);
            
            // Avisa a tela do Lojista (Dashboard Kanban)
            await redis.publish(`store:${updatedOrder.storeId}:events`, eventMsg);
          }
          break;
        }
        
        case 'PAYMENT_EXPIRED': {
          const payload = event.payload as { orderId: string, paymentId: string };
          
          // Cancela o pedido que não foi pago no tempo
          await db.update(orders)
            .set({ status: 'CANCELED', updatedAt: new Date() })
            .where(eq(orders.id, payload.orderId));
          
          break;
        }

        default:
          console.warn(`[Outbox Relay] Tipo de evento desconhecido: ${event.eventType}`);
      }

      // Marcar evento como processado de forma atômica
      await db.update(eventsOutbox)
        .set({ status: 'PROCESSED', processedAt: new Date(), error: null })
        .where(eq(eventsOutbox.id, event.id));
        
      processedCount++;
    } catch (error: any) {
      console.error(`[Outbox Relay] Erro ao processar evento ${event.id}:`, error);
      
      // Registramos o erro, mas mantemos como PENDING para tentar na próxima rodada
      // (Em um sistema maduro, adicionaríamos um contador de tentativas e status FAILED)
      await db.update(eventsOutbox)
        .set({ error: error.message || 'Unknown error' })
        .where(eq(eventsOutbox.id, event.id));
    }
  }

  return { processed: processedCount };
}
