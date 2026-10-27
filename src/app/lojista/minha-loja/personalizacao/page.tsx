import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { stores } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { MinhaLojaTabs } from "../_components/minha-loja-tabs";
import { VitrinePreviewOrganizer } from "../_components/vitrine-preview-organizer";
import { CustomizationForm } from "../../dashboard/personalizacao/customization-form";
import { listCategories } from "@/server/modules/categories/services";
import { listProducts } from "@/server/modules/products/services";

export const metadata = {
  title: "Personalizar Vitrine | Minha Loja",
};

export default async function MinhaLojaPersonalizacaoPage() {
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

  // Busca categorias e produtos para alimentar o organizador visual
  const [categories, products] = await Promise.all([
    listCategories(session.user.id),
    listProducts(session.user.id),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <MinhaLojaTabs />

      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Personalizar Vitrine</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Organize a ordem das coisas que aparecem na sua loja e personalize o visual.
          </p>
        </div>
        <Link
          href={`/${store.slug}`}
          target="_blank"
          className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-lg"
        >
          Ver Vitrine &rarr;
        </Link>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-8 mt-2">
        {/* 1. SEÇÃO PRINCIPAL: SIMULADOR VISUAL DE ORDENAÇÃO */}
        <section>
          <VitrinePreviewOrganizer
            store={store}
            initialCategories={categories}
            initialProducts={products}
          />
        </section>

        {/* 2. SEÇÃO DE DESIGN, CORES E LOGO */}
        <section className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-gray-900">Identidade Visual & Cores</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Personalize cores de botões, banners, logos e estilo de layout.
            </p>
          </div>

          <CustomizationForm initialData={store} />
        </section>
      </main>
    </div>
  );
}
