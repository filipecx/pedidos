"use client";

import { useTransition } from "react";
import { updateStoreFeeAction, toggleStoreStatusAction, revokeStoreOwnerSessionsAction } from "@/server/modules/admin/actions";
import { Store, User } from "@/db/schema";
import { toast } from "@/lib/toast-store";

interface SettingsFormProps {
  store: Store;
  owner: User;
}

export function StoreSettingsForms({ store, owner }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const feeReais = Number(formData.get("fee"));

    startTransition(async () => {
      const res = await updateStoreFeeAction({
        storeId: store.id,
        transactionFeeCents: Math.round(feeReais * 100),
      });
      if (res.success) toast.success("Taxa atualizada com sucesso!");
      else toast.error(res.error || "Erro ao atualizar taxa.");
    });
  };

  const handleToggleStatus = async () => {
    if (!confirm(`Deseja realmente ${store.isActive ? 'DESATIVAR' : 'ATIVAR'} esta loja?`)) return;
    
    startTransition(async () => {
      const res = await toggleStoreStatusAction({
        storeId: store.id,
        isActive: !store.isActive,
      });
      if (!res.success) toast.error(res.error || "Erro ao atualizar status.");
      else toast.success(`Loja ${!store.isActive ? 'ativada' : 'desativada'} com sucesso!`);
    });
  };

  const handleRevokeSessions = async () => {
    if (!confirm("Isso irá deslogar o lojista de todos os dispositivos. Tem certeza?")) return;

    startTransition(async () => {
      const res = await revokeStoreOwnerSessionsAction(owner.id);
      if (res.success) toast.success("Sessões encerradas com sucesso.");
      else toast.error(res.error || "Erro ao encerrar sessões.");
    });
  };

  return (
    <div className="space-y-8">
      {/* Status da Loja */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Controle de Status</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              O status atual da loja é: <strong className={store.isActive ? "text-green-600" : "text-red-600"}>{store.isActive ? "ATIVA" : "INATIVA"}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">Lojas inativas não recebem pedidos.</p>
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={isPending}
            className={`px-4 py-2 rounded font-medium text-white ${store.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}
          >
            {store.isActive ? "Desativar Loja" : "Ativar Loja"}
          </button>
        </div>
      </section>

      {/* Taxas da Plataforma */}
      <section className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Taxas e Split de Pagamento</h3>
        <form onSubmit={handleUpdateFee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taxa Fixa por Transação (R$)
            </label>
            <input
              type="number"
              name="fee"
              step="0.01"
              min="0"
              defaultValue={(store.transactionFeeCents / 100).toFixed(2)}
              className="border border-gray-300 rounded px-3 py-2 w-48"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Salvando..." : "Salvar Configurações"}
          </button>
        </form>
      </section>

      {/* Controle de Sessão */}
      <section className="bg-white p-6 rounded-lg shadow border-t-4 border-red-500">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Controle de Segurança</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Encerrar forçadamente todas as sessões ativas deste usuário ({owner.email}).
            </p>
          </div>
          <button
            onClick={handleRevokeSessions}
            disabled={isPending}
            className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
          >
            Derrubar Sessões
          </button>
        </div>
      </section>
    </div>
  );
}
