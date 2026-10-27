"use server";

import { db } from "@/db";
import { orders, stores, orderItems, payments, paymentEvents } from "@/db/schema";
import { eq, desc, asc, and, inArray, gte, or, lte, lt, sql, ilike } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redis } from "@/lib/redis";
import { cancelOrderAndRestoreStock } from "./stock-services";
import { refundOpenPixCharge } from "../payments/openpix";
import { isValidOrderStatusTransition, type OrderStatus } from "./state-machine";

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

  // Apenas pedidos operacionais ativos em andamento:
  // - PENDING_PAYMENT (Aguardando Pix das últimas 24h para não poluir com Pix abandonados antigos)
  // - PREPARING e READY (Cozinha e Prontos em andamento NUNCA somem até o lojista concluir/cancelar)
  // - Concluídos (DELIVERED) e Cancelados (CANCELED) não poluem a visão operacional, ficam no Histórico
  // - Encomendas: Encomendas ativas para hoje em diante ou ainda não entregues
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const merchantOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.storeId, store.id),
      inArray(orders.status, ["PENDING_PAYMENT", "PREPARING", "READY", "DISPATCHED"]),
      or(
        // Pedidos em preparo, prontos ou despachados nunca somem da visão operacional enquanto não forem concluídos
        inArray(orders.status, ["PREPARING", "READY", "DISPATCHED"]),
        // Pix aguardando pagamento recente (últimas 24h)
        gte(orders.createdAt, twentyFourHoursAgo)
      )
    ),
    orderBy: [desc(orders.createdAt)],
    limit: 100,
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

export interface GetArchivedOrdersOptions {
  page?: number;
  limit?: number;
  search?: string;
  statusFilter?: "ALL" | "DELIVERED" | "CANCELED";
  cartTypeFilter?: "ALL" | "pronta_entrega" | "encomenda";
}

export interface PaginatedArchivedOrdersResult {
  orders: any[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

export async function getMerchantArchivedOrders(
  options: GetArchivedOrdersOptions = {}
): Promise<PaginatedArchivedOrdersResult> {
  const {
    page = 1,
    limit = 20,
    search,
    statusFilter = "ALL",
    cartTypeFilter = "ALL",
  } = options;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    throw new Error("Não autorizado");
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    throw new Error("Loja não encontrada");
  }

  // Cláusulas WHERE dinâmicas
  const conditions = [
    eq(orders.storeId, store.id),
  ];

  if (statusFilter === "ALL") {
    conditions.push(inArray(orders.status, ["DELIVERED", "CANCELED"]));
  } else {
    conditions.push(eq(orders.status, statusFilter));
  }

  if (cartTypeFilter !== "ALL") {
    conditions.push(eq(orders.cartType, cartTypeFilter));
  }

  if (search && search.trim()) {
    const trimmed = search.trim();
    // Busca por nome do cliente ou pelo início do ID (cast text)
    conditions.push(
      or(
        ilike(orders.customerName, `%${trimmed}%`),
        sql`CAST(${orders.id} AS TEXT) ILIKE ${`%${trimmed}%`}`
      )!
    );
  }

  const whereClause = and(...conditions);

  // 1. Total de registros que satisfazem a busca
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(whereClause);

  const totalCount = countResult[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const offset = (currentPage - 1) * limit;

  if (totalCount === 0) {
    return {
      orders: [],
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
    };
  }

  // 2. Busca paginada
  const archived = await db.query.orders.findMany({
    where: whereClause,
    orderBy: [desc(orders.createdAt)],
    limit,
    offset,
  });

  const orderIds = archived.map(o => o.id);
  const items = await db.query.orderItems.findMany({
    where: inArray(orderItems.orderId, orderIds),
  });

  const ordersWithItems = archived.map(order => ({
    ...order,
    items: items.filter(i => i.orderId === order.id),
  }));

  return {
    orders: ordersWithItems,
    totalCount,
    totalPages,
    currentPage,
    hasMore: currentPage < totalPages,
  };
}

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus) {
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

  // Validação estrita via Máquina de Estados
  if (!isValidOrderStatusTransition(orderRecord.status as OrderStatus, newStatus)) {
    throw new Error(
      `Transição inválida: Não é permitido alterar o pedido de "${orderRecord.status}" para "${newStatus}".`
    );
  }

  if (newStatus === "CANCELED") {
    await cancelOrderAndRestoreStock(orderId);
  } else {
    await db.update(orders)
      .set({ 
        status: newStatus, 
        updatedAt: new Date(),
        ...(newStatus === "DELIVERED" ? { completionNotes: "Concluído manualmente pelo lojista" } : {})
      })
      .where(eq(orders.id, orderId));
  }

  await redis.publish(`store-orders:${store.id}`, JSON.stringify({ type: "REFRESH" })).catch(console.error);
  await redis.publish(
    `order:${orderId}:events`,
    JSON.stringify({
      event: "STATUS_UPDATED",
      orderId,
      status: newStatus,
    })
  ).catch(console.error);

  return { success: true };
}

/**
 * Server Action: Conclui todos os pedidos despachados (READY + DELIVERY) de uma só vez
 */
export async function completeAllDispatchedOrdersAction() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Não autorizado" };
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    return { success: false, error: "Loja não encontrada" };
  }

  // Busca todos os pedidos despachados (DISPATCHED ou legados READY + DELIVERY) da loja
  const dispatchedOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.storeId, store.id),
      or(
        eq(orders.status, "DISPATCHED"),
        and(eq(orders.status, "READY"), eq(orders.type, "DELIVERY"))
      )
    ),
    columns: { id: true }
  });

  if (dispatchedOrders.length === 0) {
    return { success: true, count: 0, message: "Nenhum pedido despachado pendente." };
  }

  const ids = dispatchedOrders.map(o => o.id);

  await db.update(orders)
    .set({
      status: "DELIVERED",
      completionNotes: "Concluído em lote pelo lojista",
      updatedAt: new Date(),
    })
    .where(inArray(orders.id, ids));

  await redis.publish(`store-orders:${store.id}`, JSON.stringify({ type: "REFRESH" })).catch(console.error);
  await Promise.all(
    ids.map((id) =>
      redis
        .publish(
          `order:${id}:events`,
          JSON.stringify({
            event: "STATUS_UPDATED",
            orderId: id,
            status: "DELIVERED",
          })
        )
        .catch(console.error)
    )
  );

  return { success: true, count: ids.length };
}

/**
 * Server Action: Lojista cancela o pedido e processa o estorno integral (100%) no OpenPix
 */
export async function refundOrderAction(orderId: string, reason?: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    return { success: false, error: "Não autorizado." };
  }

  // 1. Busca o pedido e a loja
  const orderRecord = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!orderRecord) {
    return { success: false, error: "Pedido não encontrado." };
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.id, orderRecord.storeId),
  });

  if (store?.userId !== session.user.id) {
    return { success: false, error: "Você não tem permissão para alterar este pedido." };
  }

  // Apenas pedidos que já foram pagos podem ser estornados
  if (orderRecord.status === "CANCELED") {
    return { success: false, error: "Este pedido já está cancelado." };
  }

  // 2. Busca o pagamento associado
  const paymentRecord = await db.query.payments.findFirst({
    where: and(
      eq(payments.orderId, orderId),
      eq(payments.status, "PAID")
    ),
  });

  if (!paymentRecord) {
    return { success: false, error: "Nenhum pagamento aprovado encontrado para este pedido." };
  }

  // 3. Executa a devolução na API do OpenPix (100% do valor)
  try {
    await refundOpenPixCharge({
      correlationID: paymentRecord.idempotencyKey,
      value: paymentRecord.amountCents,
      comment: reason || "Cancelamento e estorno solicitado pelo lojista",
    });
  } catch (error: any) {
    console.error("[Refund Error] Falha ao comunicar com OpenPix:", error);
    return {
      success: false,
      error: error?.message || "Não foi possível processar o estorno no Pix. Verifique seu saldo no OpenPix.",
    };
  }

  // 4. Transação no banco: cancela pedido, restaura estoque e atualiza status de pagamento
  await db.transaction(async (tx) => {
    // 4.1 Restaura estoque e marca pedido como CANCELED
    await cancelOrderAndRestoreStock(orderId, tx);

    // 4.2 Marca pagamento como REFUNDED
    await tx.update(payments)
      .set({ status: "REFUNDED", updatedAt: new Date() })
      .where(eq(payments.id, paymentRecord.id));

    // 4.3 Registra histórico do evento
    await tx.insert(paymentEvents).values({
      paymentId: paymentRecord.id,
      status: "REFUNDED",
      payload: {
        reason: reason || "Lojista solicitou estorno integral",
        refundedAt: new Date().toISOString(),
        amountCents: paymentRecord.amountCents,
      },
    });

    // 4.4 Subtrai das métricas da loja
    await tx.update(stores)
      .set({
        ordersCount: sql`GREATEST(0, ${stores.ordersCount} - 1)`,
        totalSalesCents: sql`GREATEST(0, ${stores.totalSalesCents} - ${orderRecord.totalCents})`,
      })
      .where(eq(stores.id, store.id));
  });

  // 5. Notifica via SSE (Lojista + Cliente)
  await redis.publish(
    `store-orders:${store.id}`,
    JSON.stringify({ type: "REFRESH", orderId })
  ).catch(console.error);

  await redis.publish(
    `order:${orderRecord.id}:events`,
    JSON.stringify({
      event: "ORDER_REFUNDED",
      orderId: orderRecord.id,
      status: "CANCELED",
    })
  ).catch(console.error);

  return { success: true };
}


export async function getDashboardMetrics(storeId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    throw new Error("Não autorizado");
  }

  const store = await db.query.stores.findFirst({
    where: and(
      eq(stores.id, storeId),
      eq(stores.userId, session.user.id)
    ),
    columns: { id: true },
  });

  if (!store) {
    throw new Error("Não autorizado a consultar métricas desta loja");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const recentOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.storeId, store.id),
      gte(orders.createdAt, sevenDaysAgo),
      inArray(orders.status, ["PREPARING", "READY", "DELIVERED"])
    ),
    columns: {
      id: true,
      totalCents: true,
      createdAt: true,
    }
  });

  const todayStr = new Date().toLocaleDateString('pt-BR');
  
  let ordersToday = 0;
  let revenueTodayCents = 0;
  
  const chartDataMap: Record<string, number> = {};
  for(let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    chartDataMap[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
  }

  recentOrders.forEach(order => {
    const orderDate = new Date(order.createdAt);
    const dateStr = orderDate.toLocaleDateString('pt-BR');
    const shortDateStr = orderDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    if (dateStr === todayStr) {
      ordersToday++;
      revenueTodayCents += order.totalCents;
    }

    if (chartDataMap[shortDateStr] !== undefined) {
      chartDataMap[shortDateStr] += order.totalCents;
    }
  });

  const chartData = Object.entries(chartDataMap).map(([date, totalCents]) => ({
    date,
    totalCents,
  }));

  return {
    ordersToday,
    revenueTodayCents,
    chartData,
  };
}
