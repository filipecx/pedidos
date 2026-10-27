import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/db/schema';

export type CartItem = {
  cartItemId: string; // ID único no carrinho
  product: Product;
  quantity: number;
  notes?: string;
};

export type CartType = 'pronta_entrega' | 'encomenda' | null;

interface CartState {
  storeId: string | null;
  items: CartItem[];
  cartType: CartType;
  
  addItem: (product: Product, addedAsType: CartType, quantity?: number, notes?: string) => { success: boolean; error?: string };
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  
  getTotalCents: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      items: [],
      cartType: null,

      addItem: (product, addedAsType, quantity = 1, notes) => {
        const state = get();
        const cleanNotes = notes?.trim() || undefined;
        
        // Regra 1: Carrinho só pode ter produtos de 1 loja
        if (state.storeId && state.storeId !== product.storeId && state.items.length > 0) {
          return { success: false, error: "Você possui itens de outra loja no carrinho. Limpe o carrinho primeiro." };
        }

        // Regra 2: Conflito de Modalidade (Pronta-Entrega vs Encomenda)
        if (state.cartType && state.cartType !== addedAsType && state.items.length > 0) {
          return { 
            success: false, 
            error: `Não é possível misturar itens de ${state.cartType === 'pronta_entrega' ? 'Pronta-Entrega' : 'Encomenda'} com ${addedAsType === 'pronta_entrega' ? 'Pronta-Entrega' : 'Encomenda'} no mesmo pedido.` 
          };
        }

        // Tudo certo para adicionar!
        set((state) => {
          // Checar se já existe o exato mesmo produto com a mesma observação
          const existingItemIndex = state.items.findIndex(
            (i) => i.product.id === product.id && (i.notes || undefined) === cleanNotes
          );
          
          let newItems = [...state.items];
          if (existingItemIndex >= 0) {
            newItems[existingItemIndex].quantity += quantity;
          } else {
            newItems.push({
              cartItemId: crypto.randomUUID(),
              product,
              quantity,
              notes: cleanNotes,
            });
          }

          return {
            storeId: product.storeId,
            cartType: addedAsType,
            items: newItems,
          };
        });

        return { success: true };
      },
      
      removeItem: (cartItemId) => set((state) => {
        const newItems = state.items.filter(i => i.cartItemId !== cartItemId);
        return {
          items: newItems,
          // Se esvaziou o carrinho, reseta o tipo e a loja
          cartType: newItems.length === 0 ? null : state.cartType,
          storeId: newItems.length === 0 ? null : state.storeId,
        };
      }),

      updateQuantity: (cartItemId, quantity) => set((state) => ({
        items: state.items.map(i => 
          i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, quantity) } : i
        )
      })),

      clearCart: () => set({ items: [], cartType: null, storeId: null }),

      getTotalCents: () => {
        const items = get().items || [];
        return items.reduce((total, item) => {
          const price = item?.product?.basePriceCents ?? 0;
          const qty = item?.quantity ?? 1;
          return total + (price * qty);
        }, 0);
      },
      
      getTotalItems: () => {
        const items = get().items || [];
        return items.reduce((total, item) => total + (item?.quantity ?? 0), 0);
      }
    }),
    {
      name: 'pedidos-cart-storage',
      // Limpa itens inválidos/corrompidos salvos em versões antigas do app
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.items)) {
          state.items = state.items.filter(
            (i) => i && i.cartItemId && i.product && typeof i.product.id === 'string'
          );
        }
      },
    }
  )
);
