import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getDashboardMetrics } from "@/server/modules/orders/merchant-queries";
import { DashboardCharts } from "./_components/dashboard-charts";
import { StoreStatusToggle } from "../_components/store-status-toggle";

export default async function LojistaDashboardPage() {
  // 1. Verifica autenticação
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // 2. Busca a loja do usuário
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  // 3. Trava de Segurança: Se não tem loja, obriga a fazer o onboarding
  if (!store) {
    redirect("/lojista/onboarding");
  }

  // 4. Busca métricas reais
  const [activeProducts, metrics] = await Promise.all([
    db.query.products.findMany({
      where: and(
        eq(products.storeId, store.id),
        eq(products.isActive, true)
      )
    }),
    getDashboardMetrics(store.id)
  ]);
  const activeCount = activeProducts.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden w-full">
      {/* Header Simples */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
            <a 
              href={`/${store.slug}`} 
              target="_blank" 
              className="text-sm text-primary hover:underline font-medium"
            >
              Ver minha vitrine
            </a>
          </div>

          <StoreStatusToggle 
            initialManualIsOpen={store.manualIsOpen} 
            businessHours={store.businessHours as any} 
          />
        </div>
        <div className="flex items-center gap-6">
          <a href="/lojista/minha-loja/personalizacao" className="text-sm text-gray-600 hover:text-primary font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Personalizar Vitrine</span>
          </a>
          <span className="text-sm text-gray-400 hidden sm:inline">|</span>
          <span className="text-sm text-gray-600 hidden sm:inline">Olá, {session.user.name}</span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-7xl mx-auto">
        {!store.pixKey && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">Chave Pix ainda não cadastrada</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Para que seus clientes possam comprar na sua vitrine e o dinheiro cair direto na sua conta, configure sua chave Pix.
                </p>
              </div>
            </div>
            <a
              href="/lojista/minha-loja"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors text-center whitespace-nowrap"
            >
              Configurar Chave Pix
            </a>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral</h2>
        
        <DashboardCharts metrics={metrics} activeCount={activeCount} />

        {/* Empty State da Vitrine */}
        {activeCount === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center max-w-3xl mx-auto mt-12">
            <div className="mx-auto h-16 w-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4 border border-gray-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Sua vitrine está vazia</h2>
            <p className="text-gray-500 mt-2 mb-8">
              Para começar a receber pedidos, você precisa adicionar os produtos e doces que você produz.
            </p>
            <a 
              href="/lojista/produtos" 
              className="inline-flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors shadow-sm"
            >
              Cadastrar Meu Primeiro Produto
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
