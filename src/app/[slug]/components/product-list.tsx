"use client";

import { useState } from "react";
import type { Category, Product } from "@/db/schema";
import Image from "next/image";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductDetailModal } from "./product-detail-modal";

interface ProductListProps {
  categories: Category[];
  products: Product[];
  cartType: "pronta_entrega" | "encomenda";
  hidden?: boolean;
}

export function ProductList({ categories, products, cartType, hidden = false }: ProductListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const activeCategories = categories.filter(category => 
    products.some(p => p.categoryId === category.id)
  );

  return (
    <div className={`w-full ${hidden ? 'hidden' : 'block'}`}>
      {/* CATEGORIES NAV (Sticky) */}
      <div className="sticky top-0 z-10 bg-[var(--color-background)] px-4 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex space-x-4 min-w-max">
          {activeCategories.map((cat) => (
            <a
              key={cat.id}
              href={`#category-${cartType}-${cat.id}`}
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
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            
            return (
              <div key={category.id} id={`category-${cartType}-${category.id}`} className="scroll-mt-24">
                <h2 className="text-xl font-bold mb-4">{category.name}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {categoryProducts.map(product => (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="group relative bg-white dark:bg-gray-900 rounded-xl overflow-visible shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col cursor-pointer hover:shadow-md hover:border-[var(--color-primary)]/40 transition-all active:scale-[0.98]"
                    >
                      {/* FOTO DO PRODUTO (Aspect Ratio Quadrado com cantos superiores arredondados) */}
                      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-xl overflow-hidden">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                            <span className="text-xl">🍰</span>
                            <span className="text-[10px] font-medium">Sem foto</span>
                          </div>
                        )}

                        {/* BADGE DE ESTOQUE */}
                        {cartType === "pronta_entrega" && product.stockQuantity !== null && product.stockQuantity <= 3 && (
                          <span className="absolute top-1.5 left-1.5 bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                            {product.stockQuantity === 0 ? "Esgotado" : `Resta ${product.stockQuantity}`}
                          </span>
                        )}
                      </div>

                      {/* BOTÃO + FLUTUANTE EM OVERFLOW (Entre a foto e o rodapé) */}
                      <div className="absolute right-2 top-[calc(100%_-_52px)] z-10">
                        <AddToCartButton 
                          product={product} 
                          cartType={cartType} 
                          className="w-8 h-8 text-base shadow-md border-2 border-white dark:border-gray-900"
                        />
                      </div>

                      {/* INFORMAÇÕES BEM JUNTINHAS (Super compacto) */}
                      <div className="p-2 pt-1.5 flex flex-col justify-center min-h-[46px] pr-9">
                        <h3 className="font-bold text-gray-900 dark:text-white text-xs line-clamp-1 leading-tight">
                          {product.name}
                        </h3>
                        <span className="font-black text-[var(--color-primary)] text-xs sm:text-sm mt-0.5 leading-none">
                          {(product.basePriceCents / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Detalhes e Zoom do Produto (Mobile First Bottom Sheet) */}
      <ProductDetailModal
        product={selectedProduct}
        cartType={cartType}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
