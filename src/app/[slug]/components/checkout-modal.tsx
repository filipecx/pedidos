"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { createOrderAction } from "@/server/modules/orders/actions";

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
  const cart = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    deliveryMethod: "PICKUP" as "DELIVERY" | "PICKUP",
    scheduledDate: "",
    scheduledTime: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!cart.storeId || !cart.cartType) throw new Error("Carrinho inválido");

      let scheduledIso = undefined;
      if (cart.cartType === "encomenda") {
        if (!formData.scheduledDate || !formData.scheduledTime) {
          throw new Error("Preencha a data e hora para a encomenda.");
        }
        scheduledIso = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      }

      const payload = {
        storeId: cart.storeId,
        customerName: formData.name,
        customerPhone: formData.phone,
        deliveryMethod: formData.deliveryMethod,
        cartType: cart.cartType,
        scheduledTime: scheduledIso,
        items: cart.items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity
        }))
      };

      const result = await createOrderAction(payload);
      
      if (!result.success) {
        setError(result.error || "Falha ao criar o pedido");
        setIsLoading(false);
        return;
      }

      // Sucesso
      alert("Checkout realizado! O carrinho será limpo. O próximo passo será mostrar o PIX (Fase 4).");
      cart.clearCart();
      onClose(); // Fecha o modal

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Finalizar Pedido</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seu Nome</label>
            <input 
              type="text" 
              required
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
              placeholder="Como quer ser chamado?"
              value={formData.name}
              onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp</label>
            <input 
              type="tel" 
              required
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Como vai receber?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, deliveryMethod: "PICKUP" }))}
                className={`flex-1 py-3 rounded-xl border ${formData.deliveryMethod === 'PICKUP' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold' : 'border-gray-200 text-gray-600'}`}
              >
                Retirada
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, deliveryMethod: "DELIVERY" }))}
                className={`flex-1 py-3 rounded-xl border ${formData.deliveryMethod === 'DELIVERY' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold' : 'border-gray-200 text-gray-600'}`}
              >
                Entrega
              </button>
            </div>
          </div>

          {cart.cartType === "encomenda" && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Para quando é a encomenda?</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date"
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(p => ({ ...p, scheduledDate: e.target.value }))}
                />
                <input 
                  type="time"
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(p => ({ ...p, scheduledTime: e.target.value }))}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-6 py-3 font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Voltar
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? "Processando..." : "Confirmar e Pagar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
