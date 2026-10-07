"use server";

import { db } from "@/db";
import { stores, user, session as sessionSchema } from "@/db/schema";
import { eq, desc, count, or, ilike, asc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateStoreFeeSchema, toggleStoreStatusSchema, UpdateStoreFeeInput, ToggleStoreStatusInput } from "./schemas";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error("Acesso negado: Apenas administradores.");
  }
}

export async function getStoresAction(
  page = 1, 
  limit = 10, 
  search?: string, 
  status?: string, 
  order: 'asc' | 'desc' | 'sales_desc' = 'desc'
) {
  await requireAdmin();
  const offset = (page - 1) * limit;

  // Monta as condições dinâmicas
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(stores.name, `%${search}%`),
        ilike(user.name, `%${search}%`)
      )
    );
  }

  if (status === 'active') {
    conditions.push(eq(stores.isActive, true));
  } else if (status === 'inactive') {
    conditions.push(eq(stores.isActive, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  
  let orderByClause;
  if (order === 'asc') {
    orderByClause = asc(stores.createdAt);
  } else if (order === 'sales_desc') {
    orderByClause = desc(stores.totalSalesCents);
  } else {
    orderByClause = desc(stores.createdAt);
  }

  const storesList = await db.select({
    store: stores,
    owner: user,
  })
  .from(stores)
  .innerJoin(user, eq(stores.userId, user.id))
  .where(whereClause)
  .limit(limit)
  .offset(offset)
  .orderBy(orderByClause);

  // Calcula o total considerando os filtros (se quiser pagination precisa contar filtrado)
  const total = await db.select({ count: count() })
    .from(stores)
    .innerJoin(user, eq(stores.userId, user.id))
    .where(whereClause);
    
  const totalCount = total[0].count;

  return {
    stores: storesList,
    total: totalCount,
    totalPages: Math.ceil(totalCount / limit),
  };
}

export async function getStoreByIdAction(storeId: string) {
  await requireAdmin();
  
  const result = await db.select({
    store: stores,
    owner: user,
  })
  .from(stores)
  .innerJoin(user, eq(stores.userId, user.id))
  .where(eq(stores.id, storeId))
  .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateStoreFeeAction(input: UpdateStoreFeeInput) {
  await requireAdmin();

  const parsed = updateStoreFeeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  try {
    await db.update(stores)
      .set({ 
        transactionFeeCents: parsed.data.transactionFeeCents
      })
      .where(eq(stores.id, parsed.data.storeId));
      
    revalidatePath(`/admin/loja/${parsed.data.storeId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao atualizar taxa" };
  }
}

export async function toggleStoreStatusAction(input: ToggleStoreStatusInput) {
  await requireAdmin();

  const parsed = toggleStoreStatusSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dados inválidos" };

  try {
    await db.update(stores)
      .set({ isActive: parsed.data.isActive })
      .where(eq(stores.id, parsed.data.storeId));
      
    revalidatePath(`/admin/loja/${parsed.data.storeId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Erro ao alterar status" };
  }
}

export async function revokeStoreOwnerSessionsAction(ownerId: string) {
  await requireAdmin();

  try {
    // Derruba a sessão excluindo os registros na tabela de sessões
    await db.delete(sessionSchema).where(eq(sessionSchema.userId, ownerId));
    return { success: true, message: "Sessões encerradas com sucesso" };
  } catch (err) {
    return { success: false, error: "Erro ao encerrar sessões" };
  }
}
