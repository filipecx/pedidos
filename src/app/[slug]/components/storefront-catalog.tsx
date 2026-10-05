"use client";

import { useState } from "react";
import type { Category, Product } from "@/db/schema";
import Image from "next/image";
import { useCartStore } from "@/lib/cart-store";
import { CartSidebar } from "./cart-sidebar";

type StorefrontCatalogProps = {
  categories: Category[];
  prontaEntregaProducts: Product[];
  encomendaProducts: Product[];
};

export function StorefrontCatalog({
  categories,
  prontaEntregaProducts,
  encomendaProducts,
}: StorefrontCatalogProps) {
  const [activeTab, setActiveTab] = useState<"pronta_entrega" | "encomenda">("pronta_entrega");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cart = useCartStore();

  const currentProducts = activeTab === "pronta_entrega" ? prontaEntregaProducts : encomendaProducts;

  // Filtrar categorias que têm produtos na aba atual
  const activeCategories = categories.filter(category => 
    currentProducts.some(p => p.categoryId === category.id)
  );

  return (
    <div className="w-full">
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

      {/* CATEGORIES NAV (Sticky) */}
      <div className="sticky top-0 z-10 bg-[var(--color-background)] px-4 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex space-x-4 min-w-max">
          {activeCategories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cat.id}`}
              className="text-sm font-semibold opacity-70 hover:opacity-100 hover:text-[var(--color-primary)] transition-colors whitespace-nowrap"
            >
              {cat.name}
            </a>
          ))}
        </div>
      </div>

      {/* PRODUCT LIST */}
      <div className="px-4 mt-4 space-y-8">
        {activeCategories.length === 0 ? (
          <div className="text-center py-10 opacity-50">
            Nenhum produto disponível nesta modalidade.
          </div>
        ) : (
          activeCategories.map(category => {
            const categoryProducts = currentProducts.filter(p => p.categoryId === category.id);
            
            return (
              <div key={category.id} id={`category-${category.id}`} className="scroll-mt-24">
                <h2 className="text-xl font-bold mb-4">{category.name}</h2>
                <div className="grid grid-cols-1 gap-4">
                  {categoryProducts.map(product => (
                    <div 
                      key={product.id}
                      className="flex bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-gray-50 dark:border-gray-800"
                    >
                      <div className="flex-1 pr-3 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                          {product.description && (
                            <p className="text-xs opacity-70 mt-1 line-clamp-2">
                              {product.description}
                            </p>
                          )}
                        </div>
                        <div className="mt-2 font-bold text-[var(--color-primary)]">
                          {(product.basePriceCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </div>
                      </div>
                      
                      {/* Product Image & Add Button */}
                      <div className="flex flex-col items-center shrink-0 ml-2 gap-2">
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <span className="text-xs">Sem foto</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            const res = cart.addItem(product, activeTab, 1);
                            if (!res.success) alert(res.error);
                          }}
                          className="w-full py-1 text-sm font-semibold rounded-md bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FLOATING CART SUMMARY (Mobile First) */}
      {cart.items.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[var(--color-primary)] text-white rounded-xl shadow-lg shadow-black/10 p-4 flex items-center justify-between font-medium"
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
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
