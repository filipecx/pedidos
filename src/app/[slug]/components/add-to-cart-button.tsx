"use client";

import { useCartStore } from "@/lib/cart-store";
import type { Product } from "@/db/schema";

import { toast } from "@/lib/toast-store";

interface AddToCartButtonProps {
  product: Product;
  cartType: "pronta_entrega" | "encomenda";
  className?: string;
}

export function AddToCartButton({ product, cartType, className = "" }: AddToCartButtonProps) {
  const cart = useCartStore();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = cart.addItem(product, cartType, 1);
    if (!res.success) {
      toast.error(res.error || "Não foi possível adicionar ao carrinho");
    }
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Adicionar ${product.name} ao carrinho`}
      className={`w-9 h-9 rounded-full bg-[var(--color-primary)] hover:opacity-90 active:scale-90 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-transform cursor-pointer shrink-0 ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}
