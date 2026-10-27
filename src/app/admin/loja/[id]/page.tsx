import { getStoreByIdAction } from "@/server/modules/admin/actions";
import { notFound } from "next/navigation";
import { StoreSettingsForms } from "./settings-form";
import Link from "next/link";

export default async function AdminStoreDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const data = await getStoreByIdAction(resolvedParams.id);
  
  if (!data) return notFound();

  const { store, owner } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-4">
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          &larr; Voltar
        </Link>
        <h2 className="text-2xl font-bold text-gray-800">
          Gerenciar Loja: {store.name}
        </h2>
        <a 
          href={`/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto bg-white border border-gray-300 text-sm font-medium text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 flex items-center"
        >
          Ver Vitrine &rarr;
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados da Loja */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dados da Loja</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nome:</dt>
              <dd className="font-medium text-gray-900">{store.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">URL Slug:</dt>
              <dd className="font-medium text-gray-900">/{store.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Chave Pix:</dt>
              <dd className="font-medium text-gray-900">{store.pixKey || "Não configurada"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Criada em:</dt>
              <dd className="font-medium text-gray-900">{new Date(store.createdAt).toLocaleDateString("pt-BR")}</dd>
            </div>
          </dl>
        </div>

        {/* Dados do Proprietário */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dados do Proprietário</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Nome:</dt>
              <dd className="font-medium text-gray-900">{owner.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email:</dt>
              <dd className="font-medium text-gray-900">{owner.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Telefone:</dt>
              <dd className="font-medium text-gray-900">{owner.phone || "Não informado"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email Verificado:</dt>
              <dd className="font-medium text-gray-900">{owner.emailVerified ? 'Sim' : 'Não'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Formulários de Configuração (Client Component) */}
      <StoreSettingsForms store={store} owner={owner} />
    </div>
  );
}
