import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCategories } from "@/server/modules/categories/services";
import { CategoriesClient } from "./_components/categories-client";
import { EstoqueTabs } from "../_components/estoque-tabs";

export default async function CategoriasPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/login");
  }

  // Busca inicial pelo Server Component
  const categories = await listCategories(session.user.id);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <EstoqueTabs />
      <div className="max-w-4xl mx-auto p-4 md:p-6 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
            <p className="text-gray-500 mt-1">Organize seu cardápio para facilitar a busca dos clientes.</p>
          </div>
        </div>

        <CategoriesClient categories={categories} />
      </div>
    </div>
  );
}
