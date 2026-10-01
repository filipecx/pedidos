import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";

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
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Olá, {session.user.name}</span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Visão Geral</h2>
        
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Pedidos Hoje</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Produtos Ativos</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Faturamento Hoje</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">R$ 0,00</p>
          </div>
        </div>

        {/* Empty State da Vitrine */}
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
            href="/lojista/produtos/novo" 
            className="inline-flex justify-center items-center py-3 px-6 rounded-xl text-sm font-semibold text-white bg-primary hover:bg-primary-hover transition-colors shadow-sm"
          >
            Cadastrar Meu Primeiro Produto
          </a>
        </div>
      </main>
    </div>
  );
}
