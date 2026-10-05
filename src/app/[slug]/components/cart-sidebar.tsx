"use client";

import { useCartStore } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckoutModal } from "./checkout-modal";

type CartSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
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
            cart.items.map((item) => (
              <div key={item.cartItemId} className="flex gap-4 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                {/* Thumb */}
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                  {item.product.imageUrl ? (
                    <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="64px" className="object-cover" />
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
                      {(item.product.basePriceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
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
            
            <button 
              onClick={() => {
                console.log("Abrindo checkout...");
                setIsCheckoutOpen(true);
              }}
              className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
            >
              Continuar para Pagamento
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
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
      />
    </>
  );
}
