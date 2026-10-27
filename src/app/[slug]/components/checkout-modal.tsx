"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/cart-store";
import { createOrderAction } from "@/server/modules/orders/actions";

const DAYS_NAMES: Record<string, string> = {
  "0": "dom",
  "1": "seg",
  "2": "ter",
  "3": "qua",
  "4": "qui",
  "5": "sex",
  "6": "sáb",
};

/**
 * Formata telefone brasileiro progressivamente enquanto o usuário digita:
 * - Apenas dígitos (máximo 11)
 * - DDD 2 dígitos: (XX)
 * - Fixo (10 dígitos): (XX) XXXX-XXXX
 * - Celular (11 dígitos): (XX) XXXXX-XXXX
 */
function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

const CUSTOMER_STORAGE_KEY = "pedidos_customer_profile_v1";

type CheckoutModalProps = {
  isOpen: boolean;
  onClose: () => void;
  businessHours?: {
    operatingDays: string[];
    deliveryIntervals: string[];
    deliveryMethods?: ("PICKUP" | "DELIVERY")[];
    pickupAddress?: string;
  } | null;
  isStoreOpen?: boolean;
};

export function CheckoutModal({ isOpen, onClose, businessHours, isStoreOpen = true }: CheckoutModalProps) {
  const cart = useCartStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedMethods: ("PICKUP" | "DELIVERY")[] =
    businessHours?.deliveryMethods && businessHours.deliveryMethods.length > 0
      ? businessHours.deliveryMethods
      : ["PICKUP", "DELIVERY"];

  const acceptsPickup = allowedMethods.includes("PICKUP");
  const acceptsDelivery = allowedMethods.includes("DELIVERY");
  const defaultMethod: "PICKUP" | "DELIVERY" = acceptsPickup ? "PICKUP" : "DELIVERY";

  // Calcula antecedência mínima (em dias) para encomendas com base nos itens do carrinho
  const maxPrepDays =
    cart.cartType === "encomenda"
      ? Math.max(0, ...cart.items.map((i) => Number(i.product?.preparationTimeDays || 0)))
      : 0;

  const minScheduledDateStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + maxPrepDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  })();

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    deliveryMethod: defaultMethod as "DELIVERY" | "PICKUP",
    scheduledDate: "",
    scheduledTime: "",
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    reference: "",
  });

  // Carrega dados salvos do cliente no navegador (localStorage) na primeira montagem
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        setFormData((prev) => ({
          ...prev,
          name: saved.name || prev.name,
          phone: saved.phone || prev.phone,
          street: saved.street || prev.street,
          number: saved.number || prev.number,
          neighborhood: saved.neighborhood || prev.neighborhood,
          complement: saved.complement || prev.complement,
          reference: saved.reference || prev.reference,
        }));
      }
    } catch {
      // Ignora erro de localStorage
    }
  }, []);

  useEffect(() => {
    if (!allowedMethods.includes(formData.deliveryMethod)) {
      setFormData((p) => ({ ...p, deliveryMethod: defaultMethod }));
    }
  }, [acceptsPickup, acceptsDelivery, formData.deliveryMethod, defaultMethod]);

  // Estado do PIX após criação do pedido
  const [pixData, setPixData] = useState<{
    orderId: string;
    brCode?: string | null;
    qrCodeImage?: string | null;
    expiresIn?: number;
  } | null>(null);

  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Escuta SSE quando o pixData estiver ativo
  useEffect(() => {
    if (!pixData?.orderId) return;

    const eventSource = new EventSource(`/api/orders/${pixData.orderId}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "PAYMENT_CONFIRMED" || data.status === "PREPARING") {
          setPaymentConfirmed(true);
          cart.clearCart();
        }
      } catch (err) {
        console.error("Erro ao processar SSE do pedido:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [pixData?.orderId]);

  let availableDaysText = "";
  if (businessHours?.operatingDays && businessHours.operatingDays.length > 0) {
    const sortedDays = [...businessHours.operatingDays].sort((a, b) => Number(a) - Number(b));
    availableDaysText = sortedDays.map(d => DAYS_NAMES[d]).join(', ');
  }

  if (!isOpen) return null;

  const handleCopyPix = () => {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    if (paymentConfirmed) {
      cart.clearCart();
    }
    setPixData(null);
    setPaymentConfirmed(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isStoreOpen) {
      setError("A loja está fechada no momento. Não é possível concluir o pedido agora.");
      return;
    }

    setIsLoading(true);

    try {
      if (!cart.storeId || !cart.cartType) throw new Error("Carrinho inválido");

      let scheduledIso = undefined;
      if (cart.cartType === "encomenda") {
        if (!formData.scheduledDate || !formData.scheduledTime) {
          throw new Error("Preencha a data e hora para a encomenda.");
        }
        if (formData.scheduledDate < minScheduledDateStr) {
          throw new Error(
            `Seus itens exigem pelo menos ${maxPrepDays} ${
              maxPrepDays === 1 ? "dia" : "dias"
            } de antecedência para preparo.`
          );
        }
        scheduledIso = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();
      }

      if (formData.deliveryMethod === "DELIVERY") {
        if (!formData.street || !formData.number || !formData.neighborhood) {
          throw new Error("Preencha a Rua, Número e Bairro para entrega.");
        }
      }

      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        throw new Error("Informe um número de WhatsApp válido com DDD (10 ou 11 dígitos).");
      }

      // Salva os dados do cliente no navegador para facilitar próximas compras
      try {
        localStorage.setItem(
          CUSTOMER_STORAGE_KEY,
          JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            street: formData.street,
            number: formData.number,
            neighborhood: formData.neighborhood,
            complement: formData.complement,
            reference: formData.reference,
          })
        );
      } catch {
        // Ignora erro de localStorage
      }

      const activeStoreId = cart.storeId;

      const payload = {
        storeId: activeStoreId,
        customerName: formData.name,
        customerPhone: formData.phone,
        deliveryMethod: formData.deliveryMethod,
        deliveryAddress: formData.deliveryMethod === "DELIVERY" ? {
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          complement: formData.complement || undefined,
          reference: formData.reference || undefined,
        } : undefined,
        cartType: cart.cartType,
        scheduledTime: scheduledIso,
        items: cart.items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          notes: i.notes || undefined,
        }))
      };

      const result = await createOrderAction(payload);
      
      if (!result.success) {
        setError(result.error || "Falha ao criar o pedido");
        setIsLoading(false);
        return;
      }

      // Sucesso: Salva o pedido ativo no localStorage da loja para o cliente não perder o QR Code/acompanhamento
      if (result.orderId) {
        try {
          localStorage.setItem(`pedidos_active_order_${activeStoreId}`, result.orderId);
          window.dispatchEvent(
            new CustomEvent("pedidos:active-order-changed", {
              detail: { orderId: result.orderId, storeId: activeStoreId },
            })
          );
        } catch {
          // Ignora erro de localStorage
        }
        cart.clearCart();
      }

      if (result.pixData && result.orderId) {
        setPixData({
          orderId: result.orderId,
          brCode: result.pixData.brCode,
          qrCodeImage: result.pixData.qrCodeImage,
          expiresIn: result.pixData.expiresIn,
        });
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* TELA DE SUCESSO / PAGAMENTO CONFIRMADO VIA SSE */}
        {paymentConfirmed ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Pagamento Confirmado!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Seu pedido <span className="font-bold text-[var(--color-primary)]">#{pixData?.orderId.slice(0, 8).toUpperCase()}</span> já foi enviado para a cozinha e está sendo preparado!
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-500">
              Você pode acompanhar as mensagens e novidades pelo seu WhatsApp.
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-opacity"
            >
              Concluir
            </button>
          </div>
        ) : pixData ? (
          /* TELA DO PIX COM QR CODE E COPIA E COLA */
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pague via PIX</h2>
              <p className="text-xs text-gray-500 mt-1">Escaneie o QR Code ou use o Pix Copia e Cola para pagar</p>
            </div>

            <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              {pixData.qrCodeImage ? (
                <img 
                  src={pixData.qrCodeImage} 
                  alt="QR Code Pix" 
                  className="w-48 h-48 rounded-lg shadow-sm bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-gray-200 rounded-lg text-gray-400 text-xs">
                  QR Code indisponível
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full font-medium animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Aguardando confirmação do pagamento...
              </div>
            </div>

            {/* Aviso de tolerância/tempo de pagamento sem cronômetro */}
            <div className="flex items-center gap-2.5 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Pague em até <strong>15 minutos</strong> para garantir a reserva dos seus produtos.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Pix Copia e Cola
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={pixData.brCode || ""}
                  className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg shrink-0 hover:opacity-90 transition-opacity"
                >
                  {copied ? "Copiado! ✓" : "Copiar"}
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Pagar mais tarde ou fechar
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE CHECKOUT */
          <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Finalizar Pedido</h2>
            
            {!isStoreOpen && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>A loja está fechada no momento. Não é possível preencher dados nem enviar pedidos.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <fieldset disabled={!isStoreOpen} className="space-y-4 contents">
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
                  maxLength={15}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatBrazilianPhone(e.target.value);
                    setFormData(p => ({ ...p, phone: formatted }));
                  }}
                />
                <p className="text-[11px] text-gray-400 mt-1">Informe DDD + número (ex: (11) 98765-4321)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Como vai receber?</label>
                <div className="flex gap-2">
                  {acceptsPickup && (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, deliveryMethod: "PICKUP" }))}
                      className={`flex-1 py-3 rounded-xl border ${formData.deliveryMethod === 'PICKUP' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold' : 'border-gray-200 text-gray-600'}`}
                    >
                      Retirada
                    </button>
                  )}
                  {acceptsDelivery && (
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, deliveryMethod: "DELIVERY" }))}
                      className={`flex-1 py-3 rounded-xl border ${formData.deliveryMethod === 'DELIVERY' ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] font-bold' : 'border-gray-200 text-gray-600'}`}
                    >
                      Entrega
                    </button>
                  )}
                </div>
              </div>

              {/* ENDEREÇO DA LOJA SE RETIRADA */}
              {formData.deliveryMethod === "PICKUP" && businessHours?.pickupAddress && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 flex items-start gap-2.5 animate-in fade-in duration-150">
                  <svg
                    className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="text-xs">
                    <span className="font-bold text-gray-800 dark:text-gray-200 block">
                      Endereço para Retirada:
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {businessHours.pickupAddress}
                    </span>
                  </div>
                </div>
              )}

              {/* CAMPOS DE ENDEREÇO SE ENTREGA */}
              {formData.deliveryMethod === "DELIVERY" && (
                <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 animate-in fade-in duration-150">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                    Endereço de Entrega
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        required
                        placeholder="Rua / Avenida *"
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        value={formData.street}
                        onChange={(e) => setFormData(p => ({ ...p, street: e.target.value }))}
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        required
                        placeholder="Número *"
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        value={formData.number}
                        onChange={(e) => setFormData(p => ({ ...p, number: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      required
                      placeholder="Bairro *"
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
                    />
                    <input 
                      type="text" 
                      placeholder="Apto / Bloco (opcional)"
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                      value={formData.complement}
                      onChange={(e) => setFormData(p => ({ ...p, complement: e.target.value }))}
                    />
                  </div>

                  <input 
                    type="text" 
                    placeholder="Ponto de referência (opcional)"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                    value={formData.reference}
                    onChange={(e) => setFormData(p => ({ ...p, reference: e.target.value }))}
                  />
                </div>
              )}

              {cart.cartType === "encomenda" && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Para quando é a encomenda?</label>
                  
                  {maxPrepDays > 0 && (
                    <div className="mb-3 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                      ⏳ Prazo mínimo de produção dos itens: <strong>{maxPrepDays} {maxPrepDays === 1 ? "dia" : "dias"}</strong> de antecedência.
                    </div>
                  )}

                  {businessHours?.operatingDays && businessHours.operatingDays.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">Dias disponíveis:</p>
                      <div className="flex flex-wrap gap-2">
                        {[...businessHours.operatingDays].sort((a, b) => Number(a) - Number(b)).map(d => (
                          <span key={d} className="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-[11px] uppercase rounded-md border border-[var(--color-primary)]/20 tracking-widest">
                            {DAYS_NAMES[d]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col relative">
                      <input 
                        type="date"
                        required
                        min={minScheduledDateStr}
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all cursor-pointer"
                        value={formData.scheduledDate}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          setFormData(p => ({ ...p, scheduledDate: selectedDate }));
                          
                          if (!selectedDate) {
                            setError(null);
                            return;
                          }

                          if (selectedDate < minScheduledDateStr) {
                            setError(
                              `Seus itens exigem pelo menos ${maxPrepDays} ${
                                maxPrepDays === 1 ? "dia" : "dias"
                              } de antecedência para preparo.`
                            );
                            return;
                          }
                          
                          if (businessHours?.operatingDays && businessHours.operatingDays.length > 0) {
                            const dateObj = new Date(selectedDate + "T12:00:00");
                            const dayOfWeek = dateObj.getDay().toString();
                            
                            if (!businessHours.operatingDays.includes(dayOfWeek)) {
                              setError("A loja não recebe encomendas para este dia da semana. Escolha outro dia.");
                              return;
                            }
                          }
                          setError(null);
                        }}
                      />
                    </div>

                    {businessHours?.deliveryIntervals && businessHours.deliveryIntervals.length > 0 ? (
                      <select
                        required
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData(p => ({ ...p, scheduledTime: e.target.value }))}
                      >
                        <option value="" disabled>Escolha o horário</option>
                        {businessHours.deliveryIntervals.map(interval => (
                          <option key={interval} value={interval.split(' - ')[0]}>
                            {interval}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="time"
                        required
                        lang="pt-BR"
                        className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData(p => ({ ...p, scheduledTime: e.target.value }))}
                      />
                    )}
                  </div>
                </div>
              )}

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-6 py-3 font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button 
                    type="submit"
                    disabled={isLoading || !!error || !isStoreOpen}
                    className={`flex-1 py-3 font-bold rounded-xl shadow-lg transition-all ${
                      isStoreOpen
                        ? "bg-[var(--color-primary)] text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60"
                    }`}
                  >
                    {!isStoreOpen 
                      ? "Loja Fechada" 
                      : isLoading 
                        ? "Processando..." 
                        : "Confirmar e Pagar"
                    }
                  </button>
                </div>
              </fieldset>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
