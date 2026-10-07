import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getMerchantOrders } from "@/server/modules/orders/merchant-queries";
import { OrdersDashboardClient } from "./_components/orders-dashboard-client";

export default async function LojistaPedidosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Busca os pedidos da loja (Server-side)
  const orders = await getMerchantOrders();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Gestão de Pedidos</h1>
          <p className="text-sm text-gray-500">Acompanhe suas vendas de pronta-entrega e encomendas.</p>
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
