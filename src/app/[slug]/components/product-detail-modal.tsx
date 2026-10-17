"use client";

import { useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/lib/cart-store";
import type { Product } from "@/db/schema";
import { toast } from "@/lib/toast-store";

interface ProductDetailModalProps {
  product: Product | null;
  cartType: "pronta_entrega" | "encomenda";
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  cartType,
  onClose,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const cart = useCartStore();

  if (!product) return null;

  const handleIncrement = () => {
    // Se for pronta-entrega, respeita o estoque se houver limite
    if (cartType === "pronta_entrega" && product.stockQuantity !== null) {
      if (quantity >= product.stockQuantity) return;
    }
    setQuantity((q) => q + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleAddToCart = () => {
    const res = cart.addItem(product, cartType, quantity);
    if (!res.success) {
      toast.error(res.error || "Não foi possível adicionar ao carrinho");
      return;
    }
    onClose();
  };

  const totalPriceFormatted = ((product.basePriceCents * quantity) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const unitPriceFormatted = (product.basePriceCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Card com margem confortável e cantos arredondados */}
      <div
        className="relative bg-white dark:bg-gray-900 w-full max-w-md sm:max-w-lg max-h-[88vh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200"
      >

        {/* Close Button Floating */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Fechar"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors shadow-md backdrop-blur-xs"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Imagem do Produto Expandida */}
          <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 640px) 100vw, 512px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg className="w-16 h-16 opacity-40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium">Sem foto</span>
              </div>
            )}
          </div>

          {/* Informações detalhadas */}
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white leading-snug">
                  {product.name}
                </h2>
                <span className="text-lg font-bold text-[var(--color-primary)] shrink-0">
                  {unitPriceFormatted}
                </span>
              </div>

              {/* Tags de Disponibilidade / Modalidade */}
              <div className="flex flex-wrap gap-2 mt-2">
                {cartType === "pronta_entrega" ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {product.stockQuantity !== null && product.stockQuantity > 0 
                      ? `${product.stockQuantity} un. em estoque` 
                      : "Pronta-Entrega"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                    {product.preparationTimeDays 
                      ? `Preparo: ${product.preparationTimeDays} dias úteis` 
                      : "Sob Encomenda"}
                  </span>
                )}
              </div>
            </div>

            {/* Descrição Completa */}
            {product.description && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Descrição
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Fixo de Ação (Mobile Bottom Bar) */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 shrink-0">
          {/* Seletor de Quantidade */}
          <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className="w-10 h-11 flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              -
            </button>
            <span className="w-9 text-center font-bold text-sm text-gray-900 dark:text-white">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={cartType === "pronta_entrega" && product.stockQuantity !== null && quantity >= product.stockQuantity}
              className="w-10 h-11 flex items-center justify-center text-lg font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              +
            </button>
          </div>

          {/* Botão de Adicionar ao Carrinho */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-1 h-11 px-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold text-sm flex items-center justify-between shadow-sm hover:opacity-95 active:scale-[0.99] transition-all"
          >
            <span>Adicionar</span>
            <span>{totalPriceFormatted}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
