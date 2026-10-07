import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores, products } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
  const activeProducts = await db.query.products.findMany({
    where: and(
      eq(products.storeId, store.id),
      eq(products.isActive, true)
    )
  });
  const activeCount = activeProducts.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simples */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
        <div className="flex items-center gap-6">
          <a href="/lojista/dashboard/personalizacao" className="text-sm text-gray-600 hover:text-primary font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Personalizar Vitrine
          </a>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm text-gray-600">Olá, {session.user.name}</span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral</h2>
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <a href="/lojista/pedidos" className="bg-white p-6 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between cursor-pointer ring-1 ring-transparent hover:ring-primary/50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                 <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
               </svg>
             </div>
             <div>
               <h3 className="text-sm font-bold text-primary mb-1">Painel de Pedidos</h3>
               <p className="text-xs text-gray-500">Gerenciar Entregas e Encomendas</p>
             </div>
             <div className="mt-4 flex items-center text-sm font-medium text-primary">
               Acessar <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
             </div>
          </a>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pedidos Hoje</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Produtos Ativos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{activeCount}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Faturamento Hoje</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">R$ 0,00</p>
          </div>
        </div>

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
