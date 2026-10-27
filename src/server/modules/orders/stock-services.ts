import { db } from "@/db";
import { orders, orderItems, products as productsSchema } from "@/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Cancela um pedido de forma atômica e idempotente, devolvendo o estoque
 * para produtos de pronta-entrega caso o pedido ainda não estivesse cancelado.
 * 
 * Cuidados tomados:
 * 1. Idempotência: Só restaura se o status do pedido não for 'CANCELED'.
 * 2. Concorrência: A transição de status para CANCELED é feita atomicamente.
 * 3. Encomendas: Apenas produtos com stock_quantity IS NOT NULL são incrementados.
 */
export async function cancelOrderAndRestoreStock(
  orderId: string,
  tx?: DbOrTx
): Promise<{ success: boolean; alreadyCanceled: boolean }> {
  const runner = tx || db;

  const execute = async (contextTx: DbOrTx) => {
    // 1. Tenta atualizar o status para CANCELED de forma atômica
    const [canceledOrder] = await contextTx
      .update(orders)
      .set({ status: "CANCELED", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), sql`${orders.status} != 'CANCELED'`))
      .returning({ id: orders.id, cartType: orders.cartType });

    // Se não retornou linha, significa que o pedido já estava CANCELED (idempotência garantida)
    if (!canceledOrder) {
      return { success: true, alreadyCanceled: true };
    }

    // 2. Busca os itens deste pedido
    const items = await contextTx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    if (items.length === 0) {
      return { success: true, alreadyCanceled: false };
    }

    // 3. Devolve o estoque de cada produto pronta-entrega
    for (const item of items) {
      await contextTx
        .update(productsSchema)
        .set({
          stockQuantity: sql`${productsSchema.stockQuantity} + ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productsSchema.id, item.productId),
            sql`${productsSchema.stockQuantity} IS NOT NULL`
          )
        );
    }

    return { success: true, alreadyCanceled: false };
  };

  // Se já estamos dentro de uma transação recebida por parâmetro, apenas roda nela
  if (tx) {
    return await execute(tx);
  }

  // Senão, abre uma transação dedicada
  return await db.transaction(async (newTx) => {
    return await execute(newTx);
  });
}
