"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";
import { CartSidebar } from "./cart-sidebar";
import { ActiveOrderTracker } from "./active-order-tracker";
import { isStoreOpenNow } from "@/server/modules/store/store-status";

interface StorefrontCatalogProps {
  storeId: string;
  prontaEntregaList: React.ReactNode;
  encomendaList: React.ReactNode;
  businessHours?: any;
  manualIsOpen?: boolean | null;
  hasPixKey?: boolean;
  defaultTab?: "pronta_entrega" | "encomenda";
}

export function StorefrontCatalog({
  storeId,
  prontaEntregaList,
  encomendaList,
  businessHours,
  manualIsOpen,
  hasPixKey = true,
  defaultTab = "pronta_entrega",
}: StorefrontCatalogProps) {
  const [activeTab, setActiveTab] = useState<"pronta_entrega" | "encomenda">(defaultTab);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [hasCheckedTime, setHasCheckedTime] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cart = useCartStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkIsOpen = () => {
      const open = isStoreOpenNow(manualIsOpen, businessHours);
      setIsStoreOpen(open);
      setHasCheckedTime(true);

      // If just loaded and store is closed, default to encomenda
      if (!open && !hasCheckedTime) {
        setActiveTab("encomenda");
      }
    };

    checkIsOpen();
    const interval = setInterval(checkIsOpen, 60000);
    return () => clearInterval(interval);
  }, [businessHours, manualIsOpen, hasCheckedTime]);

  return (
    <div className="w-full">
      {!hasPixKey && (
        <div className="mx-4 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
          <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <p className="font-bold">Vitrine em Ajustes de Pagamento</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Esta loja está concluindo as configurações de pagamento Pix. Os pedidos online estarão disponíveis em instantes!
            </p>
          </div>
        </div>
      )}

      {/* Acompanhamento em tempo real do último pedido ativo do cliente nesta loja */}
      <ActiveOrderTracker storeId={storeId} />

      {/* TABS */}
      <div className="px-4 mb-6">
        <div className="flex p-1 bg-gray-100 rounded-lg dark:bg-gray-800">
          <button
            onClick={() => setActiveTab("pronta_entrega")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "pronta_entrega"
                ? "bg-[var(--color-primary)] text-white shadow"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Pronta-Entrega
          </button>
          <button
            onClick={() => setActiveTab("encomenda")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "encomenda"
                ? "bg-[var(--color-primary)] text-white shadow"
                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Encomenda
          </button>
        </div>
      </div>

      {/* Renderização baseada na aba ativa */}
      <div className={activeTab === "pronta_entrega" ? "block" : "hidden"}>
        {!isStoreOpen && hasCheckedTime ? (
          <div className="px-4 py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl mx-4 border border-gray-100 dark:border-gray-800">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Loja Fechada no Momento</h3>
            <p className="text-sm px-4">Os pedidos para pronta-entrega estão pausados. Volte durante o horário de funcionamento ou faça uma <strong className="text-primary cursor-pointer" onClick={() => setActiveTab('encomenda')}>Encomenda</strong> para outro dia.</p>
          </div>
        ) : (
          prontaEntregaList
        )}
      </div>
      
      <div className={activeTab === "encomenda" ? "block" : "hidden"}>
        {encomendaList}
      </div>

      {/* FLOATING CART SUMMARY (Mobile First) */}
      {mounted && cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-black/10 p-4 flex items-center justify-between font-medium cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 px-3 py-1 rounded-full font-bold">
                {cart.getTotalItems()}
              </div>
              <span>Ver pedido</span>
            </div>
            <span className="font-bold">
              {(cart.getTotalCents() / 100).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL"
              })}
            </span>
          </button>
        </div>
      )}

      {/* CART SIDEBAR MODAL */}
      <CartSidebar 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        businessHours={businessHours} 
        isStoreOpen={isStoreOpen}
      />
    </div>
  );
}
