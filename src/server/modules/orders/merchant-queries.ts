"use server";

import { db } from "@/db";
import { orders, stores, orderItems } from "@/db/schema";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getMerchantOrders() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    throw new Error("Não autorizado");
  }

  // Pegar a loja do usuário
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    throw new Error("Loja não encontrada");
  }

  // Buscar todos os pedidos da loja (em um cenário real, com paginação ou limitando por data)
  // Como é MVP, vamos trazer todos os mais recentes
  const merchantOrders = await db.query.orders.findMany({
    where: eq(orders.storeId, store.id),
    orderBy: [desc(orders.createdAt)],
    limit: 200, // Prevenção de overload
  });

  if (merchantOrders.length === 0) return [];

  const orderIds = merchantOrders.map(o => o.id);
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, orderIds),
  });

  // Mapear os itens para os pedidos
  const ordersWithItems = merchantOrders.map(order => ({
    ...order,
    items: items.filter(i => i.orderId === order.id),
  }));

  return ordersWithItems;
}

export async function updateOrderStatusAction(orderId: string, newStatus: "PENDING_PAYMENT" | "PREPARING" | "READY" | "DELIVERED" | "CANCELED") {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    throw new Error("Não autorizado");
  }

  // Verifica se o pedido pertence à loja do lojista
  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });

  if (!orderRecord) throw new Error("Pedido não encontrado");

  const store = await db.query.stores.findFirst({
    where: eq(stores.id, orderRecord.storeId)
  });

  if (store?.userId !== session.user.id) {
    throw new Error("Não autorizado a alterar este pedido");
  }

  await db.update(orders)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return { success: true };
}
