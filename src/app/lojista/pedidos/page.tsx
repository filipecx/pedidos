import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMerchantOrders } from "@/server/modules/orders/merchant-queries";
import { OrdersDashboardClient } from "./_components/orders-dashboard-client";

import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { StoreStatusToggle } from "../_components/store-status-toggle";

export default async function LojistaPedidosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Busca os pedidos da loja e a loja (Server-side)
  const [orders, store] = await Promise.all([
    getMerchantOrders(),
    db.query.stores.findFirst({
      where: eq(stores.userId, session.user.id),
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestão de Pedidos</h1>
            <p className="text-sm text-gray-500">Acompanhe suas vendas de pronta-entrega e encomendas.</p>
          </div>

          {store && (
            <StoreStatusToggle 
              initialManualIsOpen={store.manualIsOpen} 
              businessHours={store.businessHours as any} 
            />
          )}
        </div>
        <div className="flex items-center gap-4">
          <a href="/lojista/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary transition-colors">
            &larr; Voltar ao Dashboard
          </a>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <OrdersDashboardClient initialOrders={orders} />
      </main>
    </div>
  );
}
