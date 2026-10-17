"use client";

import { useCartStore } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckoutModal } from "./checkout-modal";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  businessHours?: {
    operatingDays: string[];
    deliveryIntervals: string[];
  } | null;
  isStoreOpen?: boolean;
};

export function CartSidebar({ isOpen, onClose, businessHours, isStoreOpen = true }: CartSidebarProps) {
  const cart = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Prevents hydration errors from Zustand persist
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return (
    <>
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* SIDEBAR / BOTTOM SHEET */}
      <div className="fixed inset-y-0 right-0 z-[70] w-full md:w-[400px] bg-[var(--color-background)] shadow-2xl flex flex-col animate-in slide-in-from-right-full md:slide-in-from-right duration-300 transform sm:border-l border-gray-200 dark:border-gray-800">
        
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold">Seu Pedido</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* CART ITEMS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
              <p>Seu carrinho está vazio.</p>
            </div>
          ) : (
            cart.items.map((item) => {
              if (!item?.product) return null;
              return (
                <div key={item.cartItemId} className="flex gap-4 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                  {/* Thumb */}
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                    {item.product.imageUrl ? (
                      <Image src={item.product.imageUrl} alt={item.product.name || "Produto"} fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[10px] text-gray-400">Sem foto</span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-sm leading-tight pr-2">{item.product.name}</h3>
                      <button 
                        onClick={() => cart.removeItem(item.cartItemId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-bold text-[var(--color-primary)] text-sm">
                        {((item.product.basePriceCents ?? 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                    
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md">
                        <button 
                          onClick={() => cart.updateQuantity(item.cartItemId, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-l-md font-bold"
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="px-2 text-sm font-semibold min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => cart.updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-r-md font-bold"
                          disabled={item.quantity >= 99}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        {cart.items.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4 text-lg">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-[var(--color-primary)]">
                {(cart.getTotalCents() / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
            
            {!isStoreOpen && (
              <div className="mb-3 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>A loja está fechada no momento. Não é possível concluir o pedido agora.</span>
              </div>
            )}

            <button 
              onClick={() => {
                if (!isStoreOpen) return;
                console.log("Abrindo checkout...");
                setIsCheckoutOpen(true);
              }}
              disabled={!isStoreOpen}
              className={`w-full py-4 font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 ${
                isStoreOpen
                  ? "bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-[0.99] cursor-pointer"
                  : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
              }`}
            >
              {isStoreOpen ? "Continuar para Pagamento" : "Loja Fechada"}
              {isStoreOpen && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                </svg>
              )}
            </button>
            <div className="text-center mt-3">
              <button onClick={() => cart.clearCart()} className="text-sm text-gray-500 hover:text-red-500 font-medium">
                Limpar carrinho
              </button>
            </div>
          </div>
        )}
      </div>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)}
        businessHours={businessHours}
        isStoreOpen={isStoreOpen}
      />
    </>
  );
}
