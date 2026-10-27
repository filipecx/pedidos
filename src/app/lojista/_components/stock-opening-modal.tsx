"use client";

import { useState } from "react";
import { StockStatusSummary } from "@/server/modules/products/stock-services";
import { 
  restoreStoreDefaultStockAction, 
  quickUpdateProductStockAction 
} from "@/server/modules/products/actions";
import { toast } from "@/lib/toast-store";

interface StockOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOpenStore: () => void;
  stockSummary: StockStatusSummary;
}

export function StockOpeningModal({
  isOpen,
  onClose,
  onConfirmOpenStore,
  stockSummary,
}: StockOpeningModalProps) {
  const [items, setItems] = useState(stockSummary.items);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdjustMode, setIsAdjustMode] = useState(false);

  if (!isOpen) return null;

  // Restaurar Todos os produtos para o estoque padrão
  const handleRestoreAll = async () => {
    setIsUpdating(true);
    try {
      const res = await restoreStoreDefaultStockAction();
      if (res.success) {
        toast.success(res.message || "Estoque padrão restaurado!");
        onConfirmOpenStore();
        onClose();
      } else {
        toast.error(res.error || "Erro ao restaurar estoque.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro inesperado ao restaurar estoque.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Ajuste rápido de quantidade (+ / -)
  const handleQuantityChange = async (productId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    setItems((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, stockQuantity: newQty } : item))
    );

    try {
      const res = await quickUpdateProductStockAction(productId, newQty);
      if (!res.success) {
        toast.error(res.error || "Erro ao atualizar item.");
        // Reverte
        setItems((prev) =>
          prev.map((item) =>
            item.id === productId ? { ...item, stockQuantity: currentQty } : item
          )
        );
      }
    } catch {
      toast.error("Erro ao salvar estoque.");
      setItems((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, stockQuantity: currentQty } : item
        )
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              📦
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                Atenção ao Estoque
              </h2>
              <p className="text-xs text-gray-500">
                {stockSummary.zeroStockCount} de {stockSummary.totalProntaEntregaCount} itens estão zerados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
            Sua loja tem itens de pronta-entrega sem estoque. Deseja redefinir para a produção padrão ou ajustar as quantidades antes de abrir?
          </p>

          {/* Lista de itens zerados ou ajustáveis (Mobile-Friendly) */}
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl bg-gray-50/50 overflow-hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 flex items-center justify-between gap-3 bg-white"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Padrão cadastrado:{" "}
                    <strong className="text-gray-700">
                      {item.defaultStock ?? 0} un
                    </strong>
                  </p>
                </div>

                {isAdjustMode ? (
                  /* Controles Rápidos (+ / -) pensados para toque no celular */
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.stockQuantity ?? 0,
                          -1
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center active:scale-95 transition-transform"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-gray-900">
                      {item.stockQuantity ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleQuantityChange(
                          item.id,
                          item.stockQuantity ?? 0,
                          1
                        )
                      }
                      className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm flex items-center justify-center active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-md shrink-0">
                    Esgotado (0)
                  </span>
                )}
              </div>
            ))}
          </div>

          {!isAdjustMode ? (
            <button
              type="button"
              onClick={() => setIsAdjustMode(true)}
              className="text-xs font-semibold text-primary hover:underline block text-center w-full py-1"
            >
              Prefiro ajustar item por item manualmente &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdjustMode(false)}
              className="text-xs font-semibold text-gray-500 hover:underline block text-center w-full py-1"
            >
              &larr; Voltar para opções rápidas
            </button>
          )}
        </div>

        {/* Footer / Ações */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleRestoreAll}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 cursor-pointer text-center"
          >
            {isUpdating ? "Restaurando..." : "⚡ Restaurar estoque padrão de todos e Abrir"}
          </button>

          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              onConfirmOpenStore();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer text-center"
          >
            Abrir loja sem alterar estoque
          </button>
        </div>
      </div>
    </div>
  );
}
