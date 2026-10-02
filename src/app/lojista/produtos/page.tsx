import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listProducts } from "@/server/modules/products/services";
import { listCategories } from "@/server/modules/categories/services";
import { ProductsClient } from "./_components/products-client";

export default async function ProdutosPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "LOJISTA") {
    redirect("/lojista/cadastro");
  }

  // Busca inicial pelo Server Component executada em paralelo
  const [products, categories] = await Promise.all([
    listProducts(session.user.id, { isCombo: false }),
    listCategories(session.user.id)
  ]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-gray-500 mt-1">Gerencie seu cardápio, estoques e encomendas.</p>
        </div>
      </div>

      <ProductsClient initialProducts={products} categories={categories} />
    </div>
  );
}
