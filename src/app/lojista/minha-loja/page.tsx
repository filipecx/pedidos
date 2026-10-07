import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

export default async function MinhaLojaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    redirect("/lojista/onboarding");
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Minha Loja</h1>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informações da Loja</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p><span className="font-medium">Nome:</span> {store.name}</p>
            <p><span className="font-medium">Slug (Link):</span> /{store.slug}</p>
            <p><span className="font-medium">Chave Pix:</span> {store.pixKey || "Não configurada"}</p>
          </div>
          <div className="mt-6 flex gap-4">
            <Link 
              href={`/${store.slug}`} 
              target="_blank"
              className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Ver Vitrine
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Personalização</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ajuste as cores, banner e logotipo da sua vitrine virtual.
          </p>
          <Link 
            href="/lojista/dashboard/personalizacao"
            className="inline-block border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Editar Personalização
          </Link>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Minha Conta</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p><span className="font-medium">Nome:</span> {session.user.name}</p>
            <p><span className="font-medium">Email:</span> {session.user.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
