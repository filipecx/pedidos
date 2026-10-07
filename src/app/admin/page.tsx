import { getStoresAction } from "@/server/modules/admin/actions";
import Link from "next/link";
import { Suspense } from "react";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const limit = 10;
  
  const { stores, total, totalPages } = await getStoresAction(page, limit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Lojistas ({total})</h2>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loja</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stores.map(({ store, owner }) => (
              <tr key={store.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{store.name}</div>
                  <div className="text-sm text-gray-500">/{store.slug}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{owner.name}</div>
                  <div className="text-sm text-gray-500">{owner.email}</div>
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
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum lojista encontrado.
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
            <Link href={`/admin?page=${page - 1}`} className="px-4 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">
              Anterior
            </Link>
          )}
          <span className="px-4 py-2 text-gray-700">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`/admin?page=${page + 1}`} className="px-4 py-2 border rounded bg-white text-gray-700 hover:bg-gray-50">
              Próxima
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
