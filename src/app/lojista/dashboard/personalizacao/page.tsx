import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import { CustomizationForm } from "./customization-form";

export const metadata = {
  title: "Personalizar Vitrine | Dashboard Lojista",
};

export default async function PersonalizacaoPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Busca a loja do usuário e as configurações atuais
  const store = await db.query.stores.findFirst({
    where: eq(stores.userId, session.user.id),
  });

  if (!store) {
    redirect("/lojista/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header (Idealmente futuramente será um Layout global compartilhado) */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <a href="/lojista/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </a>
          <h1 className="text-xl font-bold text-gray-900">Configurações da Vitrine</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-4xl mx-auto mt-4 sm:mt-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Personalize sua Loja</h2>
            <p className="text-gray-500 mt-2 text-sm max-w-2xl">
              Defina as cores principais, coloque a logo da sua marca e escolha o formato em que os produtos e categorias serão exibidos para os seus clientes.
            </p>
          </div>

          <CustomizationForm initialData={store} />
        </div>
      </main>
    </div>
  );
}
