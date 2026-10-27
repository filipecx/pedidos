"use client";

import { useState } from "react";
import { updateStoreManualStatusAction } from "@/server/modules/store/actions";
import { getStoreStockStatusSummaryAction } from "@/server/modules/products/actions";
import { StockStatusSummary } from "@/server/modules/products/stock-services";
import { StockOpeningModal } from "./stock-opening-modal";
import { isStoreOpenNow, StoreBusinessHours } from "@/server/modules/store/store-status";
import { toast } from "@/lib/toast-store";

interface StoreStatusToggleProps {
  initialManualIsOpen: boolean | null;
  businessHours: StoreBusinessHours | null;
}

export function StoreStatusToggle({
  initialManualIsOpen,
  businessHours,
}: StoreStatusToggleProps) {
  const [manualStatus, setManualStatus] = useState<boolean | null>(initialManualIsOpen);
  const [isLoading, setIsLoading] = useState(false);
  const [stockSummary, setStockSummary] = useState<StockStatusSummary | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);

  // Calcula o status atual efetivo
  const isCurrentlyOpen = isStoreOpenNow(manualStatus, businessHours);

  const performStatusUpdate = async (newStatus: boolean | null) => {
    setIsLoading(true);
    try {
      const res = await updateStoreManualStatusAction(newStatus);
      if (res.success) {
        setManualStatus(newStatus);
        if (newStatus === true) {
          toast.success("Loja definida como aberta!");
        } else if (newStatus === false) {
          toast.success("Loja fechada para novos pedidos.");
        } else {
          toast.success("Loja definida para horário automático.");
        }
      } else {
        toast.error(res.error || "Não foi possível alterar o status da loja.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (newStatus: boolean | null) => {
    if (isLoading) return;

    // Se estiver tentando ABRIR a loja (ou ir para true), checa se há produtos com estoque zerado
    if (newStatus === true) {
      setIsLoading(true);
      try {
        const stockRes = await getStoreStockStatusSummaryAction();
        if (stockRes.success && stockRes.summary && stockRes.summary.hasZeroStockItems) {
          setStockSummary(stockRes.summary);
          setShowStockModal(true);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        // Se der erro ao checar estoque, segue fluxo normal
      }
      setIsLoading(false);
    }

    await performStatusUpdate(newStatus);
  };

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isCurrentlyOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
        />
        <div className="flex flex-col">
          <span className="text-xs font-bold leading-none text-gray-900">
            {isCurrentlyOpen ? "Loja Aberta" : "Loja Fechada"}
          </span>
          <span className="text-[10px] text-gray-500 leading-none mt-0.5">
            {manualStatus === null
              ? "Automático"
              : manualStatus
              ? "Forçado Aberto"
              : "Forçado Fechado"}
          </span>
        </div>
      </div>

      <div className="h-5 w-px bg-gray-200" />

      {/* Botões Rápidos */}
      <div className="flex items-center gap-1">
        {isCurrentlyOpen ? (
          <button
            type="button"
            onClick={() => handleToggle(false)}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar a loja agora"
          >
            {isLoading ? "..." : "Fechar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleToggle(true)}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Abrir a loja agora"
          >
            {isLoading ? "..." : "Abrir"}
          </button>
        )}

        {manualStatus !== null && (
          <button
            type="button"
            onClick={() => handleToggle(null)}
            disabled={isLoading}
            className="px-2 py-1 text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Voltar a seguir o horário automático de atendimento"
          >
            Horário Auto
          </button>
        )}
      </div>

      {/* Modal Mobile-First de Gestão de Estoque ao Abrir a Loja */}
      {showStockModal && stockSummary && (
        <StockOpeningModal
          isOpen={showStockModal}
          stockSummary={stockSummary}
          onClose={() => setShowStockModal(false)}
          onConfirmOpenStore={() => performStatusUpdate(true)}
        />
      )}
    </div>
  );
}
