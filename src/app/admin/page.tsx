import { getStoresAction } from "@/server/modules/admin/actions";
import Link from "next/link";
import { Suspense } from "react";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; order?: 'asc' | 'desc' | 'sales_desc' }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const q = resolvedSearchParams.q || "";
  const status = resolvedSearchParams.status || "all";
  const order = resolvedSearchParams.order || "desc";
  const limit = 10;
  
  const { stores, total, totalPages } = await getStoresAction(page, limit, q, status, order);

  // Helper to keep existing query params on pagination
  const buildPageUrl = (newPage: number) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set("page", newPage.toString());
    if (q) params.set("q", q);
    if (status !== "all") params.set("status", status);
    if (order !== "desc") params.set("order", order);
    return `/admin?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Lojistas ({total})</h2>
        
        <form method="GET" className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar loja ou dono..."
            className="border border-gray-300 rounded px-3 py-2 text-sm w-full sm:w-64 focus:ring-primary focus:border-primary"
          />
          <select 
            name="status" 
            defaultValue={status}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="all">Status: Todos</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>
          <select 
            name="order" 
            defaultValue={order}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:ring-primary focus:border-primary"
          >
            <option value="desc">Mais recentes</option>
            <option value="asc">Mais antigas</option>
            <option value="sales_desc">Que mais vendem</option>
          </select>
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary/90">
            Filtrar
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendas Totais</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criada em</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stores.map(({ store, owner }) => (
              <tr key={store.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{store.name}</div>
                  <div className="text-sm text-gray-500">/{store.slug} • {owner.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-green-600">
                    R$ {(store.totalSalesCents / 100).toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-xs text-gray-500">{store.ordersCount} pedidos</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(store.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {store.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link href={`/admin/loja/${store.id}`} className="text-primary hover:text-primary/80">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum lojista encontrado para essa busca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {page > 1 && (
            <Link href={buildPageUrl(page - 1)} className="px-4 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">
              Anterior
            </Link>
          )}
          <span className="px-4 py-2 text-gray-700">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={buildPageUrl(page + 1)} className="px-4 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
