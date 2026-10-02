import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCategories } from "@/server/modules/categories/services";
import { CategoriesClient } from "./_components/categories-client";

export default async function CategoriasPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/lojista/cadastro");
  }

  // Busca inicial pelo Server Component
  const categories = await listCategories(session.user.id);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-gray-500 mt-1">Organize seu cardápio para facilitar a busca dos clientes.</p>
        </div>
      </div>

      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
