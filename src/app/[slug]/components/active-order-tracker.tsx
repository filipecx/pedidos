"use client";

import { useEffect, useState, useCallback } from "react";
import { getPublicOrderTrackingAction } from "@/server/modules/orders/actions";

type TrackedOrder = NonNullable<Awaited<ReturnType<typeof getPublicOrderTrackingAction>>>;

export function ActiveOrderTracker({ storeId }: { storeId: string }) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const storageKey = `pedidos_active_order_${storeId}`;

  const fetchOrder = useCallback(async (orderId: string) => {
    const data = await getPublicOrderTrackingAction(orderId);
    if (!data || data.status === "CANCELED") {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setOrder(null);
      return;
    }
    setOrder(data);
  }, [storageKey]);

  useEffect(() => {
    try {
      const savedOrderId = localStorage.getItem(storageKey);
      if (savedOrderId) {
        fetchOrder(savedOrderId);
      }
    } catch {}

    const handleOrderChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ orderId: string; storeId: string }>;
      if (customEvent.detail?.storeId === storeId && customEvent.detail?.orderId) {
        fetchOrder(customEvent.detail.orderId);
      }
    };

    window.addEventListener("pedidos:active-order-changed", handleOrderChanged);
    return () => {
      window.removeEventListener("pedidos:active-order-changed", handleOrderChanged);
    };
  }, [storeId, storageKey, fetchOrder]);

  // Escuta atualizações em tempo real via SSE para o pedido ativo
  useEffect(() => {
    if (!order?.id) return;

    const eventSource = new EventSource(`/api/orders/${order.id}/sse`);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "PAYMENT_CONFIRMED" || data.status === "PREPARING") {
          setOrder((prev) => (prev ? { ...prev, status: "PREPARING", pixData: null } : prev));
        } else if (data.event === "STATUS_UPDATED" && data.status) {
          if (data.status === "CANCELED") {
            try {
              localStorage.removeItem(storageKey);
            } catch {}
            setOrder(null);
            setIsModalOpen(false);
          } else {
            setOrder((prev) => (prev ? { ...prev, status: data.status } : prev));
          }
        } else if (data.event === "ORDER_REFUNDED" || data.status === "CANCELED") {
          try {
            localStorage.removeItem(storageKey);
          } catch {}
          setOrder(null);
          setIsModalOpen(false);
        }
      } catch (err) {
        console.error("Erro no SSE de acompanhamento do pedido:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [order?.id, storageKey]);

  if (!order) return null;

  const shortCode = order.id.split("-")[0].toUpperCase();
  const isDelivery = order.type === "DELIVERY";

  const statusConfig: Record<
    string,
    { title: string; subtitle: string; badgeClass: string; buttonLabel: string }
  > = {
    PENDING_PAYMENT: {
      title: `Pedido #${shortCode} • Aguardando Pix`,
      subtitle: "Toque para abrir o QR Code ou copiar o código Pix",
      badgeClass: "bg-amber-50 border-amber-300 text-amber-900",
      buttonLabel: "Pagar Pix",
    },
    PREPARING: {
      title: `Pedido #${shortCode} • Em Preparo`,
      subtitle: "Pagamento confirmado! A cozinha já está preparando seu pedido.",
      badgeClass: "bg-blue-50 border-blue-200 text-blue-900",
      buttonLabel: "Acompanhar",
    },
    READY: {
      title: isDelivery
        ? `Pedido #${shortCode} • Saiu para Entrega!`
        : `Pedido #${shortCode} • Pronto para Retirada!`,
      subtitle: isDelivery
        ? "Seu pedido foi despachado e está a caminho."
        : "Seu pedido já está prontinho esperando por você no balcão!",
      badgeClass: "bg-emerald-50 border-emerald-300 text-emerald-900",
      buttonLabel: "Ver Pedido",
    },
    DELIVERED: {
      title: `Pedido #${shortCode} • Concluído`,
      subtitle: "Obrigado pela preferência! Bom apetite!",
      badgeClass: "bg-gray-100 border-gray-200 text-gray-800",
      buttonLabel: "Detalhes",
    },
  };

  const currentInfo = statusConfig[order.status] || statusConfig.PREPARING;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setOrder(null);
    setIsModalOpen(false);
  };

  const handleCopyPix = () => {
    if (!order.pixData?.brCode) return;
    navigator.clipboard.writeText(order.pixData.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const steps = [
    { id: "PENDING_PAYMENT", label: "Pix" },
    { id: "PREPARING", label: "Preparo" },
    { id: "READY", label: isDelivery ? "Despachado" : "Pronto" },
    { id: "DELIVERED", label: "Concluído" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === order.status);

  return (
    <>
      {/* Barra de Acompanhamento na Vitrine */}
      <div className="px-4 mb-5">
        <div
          onClick={() => setIsModalOpen(true)}
          className={`w-full p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-3 ${currentInfo.badgeClass}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse shrink-0" />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">{currentInfo.title}</p>
              <p className="text-[11px] opacity-80 truncate">{currentInfo.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-bold shadow-2xs">
              {currentInfo.buttonLabel}
            </span>
            {order.status === "DELIVERED" && (
              <button
                type="button"
                onClick={handleDismiss}
                title="Fechar aviso"
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Acompanhamento e Recuperação de QR Code Pix */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Pedido #{shortCode}
                </h3>
                <p className="text-xs text-gray-500">
                  {order.cartType === "encomenda" && order.scheduledTime
                    ? `Encomenda para ${new Date(order.scheduledTime).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : isDelivery
                      ? "Pronta-Entrega • Delivery"
                      : "Pronta-Entrega • Retirada no Local"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Stepper de Progresso */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {steps.map((step, idx) => {
                const isDone =
                  order.status === "DELIVERED"
                    ? true
                    : idx < currentStepIndex || (idx === currentStepIndex && idx > 0);
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step.id} className="flex flex-col items-center text-center">
                    <div
                      className={`w-full h-1.5 rounded-full mb-1.5 transition-colors ${
                        isDone || isCurrent
                          ? "bg-[var(--color-primary)]"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-semibold ${
                        isCurrent
                          ? "text-[var(--color-primary)] font-bold"
                          : isDone
                            ? "text-gray-700 dark:text-gray-300"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Se ainda estiver aguardando pagamento, exibe o QR Code Pix recuperado */}
            {order.status === "PENDING_PAYMENT" && order.pixData && (
              <div className="space-y-3 bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200/70 dark:border-amber-800/40">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 text-center">
                  Escaneie o QR Code ou copie o código Pix abaixo para confirmar seu pedido:
                </p>
                {order.pixData.qrCodeImage && (
                  <div className="flex justify-center">
                    <img
                      src={order.pixData.qrCodeImage}
                      alt="QR Code Pix"
                      className="w-44 h-44 rounded-xl bg-white p-2 shadow-xs"
                    />
                  </div>
                )}
                {order.pixData.brCode && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={order.pixData.brCode}
                      className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="px-3.5 py-2 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg shrink-0"
                    >
                      {copied ? "Copiado! ✓" : "Copiar"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Endereço de Retirada ou Entrega */}
            {!isDelivery && order.pickupAddress && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
                <span className="font-bold text-gray-800 dark:text-gray-200 block mb-0.5">
                  📍 Local de Retirada:
                </span>
                <span className="text-gray-600 dark:text-gray-300">{order.pickupAddress}</span>
              </div>
            )}

            {isDelivery && order.deliveryAddress && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 text-xs">
                <span className="font-bold text-gray-800 dark:text-gray-200 block mb-0.5">
                  🛵 Endereço de Entrega:
                </span>
                {(() => {
                  const addr: any =
                    typeof order.deliveryAddress === "string"
                      ? JSON.parse(order.deliveryAddress)
                      : order.deliveryAddress;
                  return (
                    <span className="text-gray-600 dark:text-gray-300">
                      {addr.street}, nº {addr.number} — {addr.neighborhood}
                      {addr.complement ? ` (${addr.complement})` : ""}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Resumo dos Itens */}
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 block">
                Itens do Pedido
              </span>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.notes && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {(item.totalPriceCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800 font-bold text-base">
                <span>Total</span>
                <span className="text-[var(--color-primary)]">
                  {(order.totalCents / 100).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
