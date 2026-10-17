"use client";

import { useEffect, useState } from "react";
import type { OrderWithItems } from "./orders-dashboard-client";
import { toast } from "@/lib/toast-store";

interface OrderModalProps {
  order: OrderWithItems;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => void;
  onRefundOrder?: (reason?: string) => Promise<boolean>;
}

export function OrderModal({ order, onClose, onUpdateStatus, onRefundOrder }: OrderModalProps) {
  const [isRefunding, setIsRefunding] = useState(false);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const isDelivery = order.type === "DELIVERY";

  const statuses = [
    { id: "PENDING_PAYMENT", label: "Aguardando Pagamento", color: "text-gray-600 bg-gray-100" },
    { id: "PREPARING", label: "Preparando", color: "text-blue-700 bg-blue-100" },
    { 
      id: "READY", 
      label: "Pronto", 
      color: "text-yellow-700 bg-yellow-100" 
    },
    { 
      id: "DELIVERED", 
      label: isDelivery ? "Entregue ao Cliente" : "Retirado no Balcão", 
      color: "text-green-700 bg-green-100" 
    },
    { id: "CANCELED", label: "Cancelado", color: "text-red-700 bg-red-100" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Pedido #{order.id.split('-')[0].toUpperCase()}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleString('pt-BR')}
              </p>
              {order.completionNotes && (
                <span className="text-[11px] font-medium text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                  🤖 {order.completionNotes}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Dados do Cliente */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Cliente</h3>
            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
              <div className="flex justify-between">
                <span className="text-gray-500">Nome:</span>
                <span className="font-medium text-gray-900">{order.customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Telefone:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{order.customerPhone}</span>
                  <a
                    href={`https://wa.me/55${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${order.customerName}! Tudo bem? Estou entrando em contato sobre o seu pedido #${order.id.split('-')[0].toUpperCase()}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo:</span>
                <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                  {order.type === 'DELIVERY' ? 'Entrega' : 'Retirada no Local'}
                </span>
              </div>
              {order.type === 'DELIVERY' && order.deliveryAddress && (
                <div className="pt-2 mt-2 border-t border-gray-200">
                  <span className="text-gray-500 block mb-1">Endereço de Entrega:</span>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 space-y-0.5">
                    {(() => {
                      const addr: any = typeof order.deliveryAddress === 'string'
                        ? JSON.parse(order.deliveryAddress)
                        : order.deliveryAddress;
                      return (
                        <>
                          <p className="font-semibold">{addr.street}, nº {addr.number}</p>
                          <p className="text-gray-600">Bairro: {addr.neighborhood}</p>
                          {addr.complement && <p className="text-gray-500 text-xs">Compl: {addr.complement}</p>}
                          {addr.reference && <p className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs mt-1">Ref: {addr.reference}</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* MENSAGENS RÁPIDAS PARA O CLIENTE */}
            <div className="mt-3">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-2">
                Copiar Mensagens Prontas
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Olá ${order.customerName}! Seu pedido #${order.id.split('-')[0].toUpperCase()} já foi recebido e está sendo preparado com muito carinho!`;
                    navigator.clipboard.writeText(msg);
                    toast.success("Mensagem copiada para a área de transferência!");
                  }}
                  className="px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-left transition-colors"
                >
                  👨‍🍳 Pedido em preparo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const addr: any = order.deliveryAddress ? (typeof order.deliveryAddress === 'string' ? JSON.parse(order.deliveryAddress) : order.deliveryAddress) : null;
                    const addressText = addr ? ` para o endereço: ${addr.street}, nº ${addr.number} (${addr.neighborhood})` : "";
                    const msg = order.type === 'DELIVERY'
                      ? `Olá ${order.customerName}! Seu pedido #${order.id.split('-')[0].toUpperCase()} está pronto e já pode ser enviado${addressText}!`
                      : `Olá ${order.customerName}! Seu pedido #${order.id.split('-')[0].toUpperCase()} está prontinho para retirada no balcão!`;
                    navigator.clipboard.writeText(msg);
                    toast.success("Mensagem copiada para a área de transferência!");
                  }}
                  className="px-2.5 py-1.5 text-xs bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-left transition-colors"
                >
                  🚀 Pedido pronto
                </button>
              </div>
            </div>
          </section>

          {/* Itens do Pedido */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between items-start border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      <span className="text-gray-400 mr-2">{item.quantity}x</span>
                      {item.productName}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-yellow-600 mt-1 bg-yellow-50 p-1.5 rounded inline-block">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {(item.totalPriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Totais */}
          <section className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium text-gray-900">{(order.subtotalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Taxa de Entrega:</span>
              <span className="font-medium text-gray-900">{(order.deliveryFeeCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-900">Total:</span>
              <span className="text-primary">{(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
          </section>
        </div>

        {/* Rodapé - Ações de Status e Estorno */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Botão de Ação Principal em Destaque para Pedidos Prontos/Despachados */}
          {order.status === "READY" && (
            <button
              type="button"
              onClick={() => onUpdateStatus("DELIVERED")}
              className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              <span>{isDelivery ? "Confirmar Entrega (Concluir Pedido)" : "Confirmar Retirada (Concluir Pedido)"}</span>
            </button>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alterar Status Manualmente</label>
            <div className="grid grid-cols-2 gap-2">
              {statuses.map(s => {
                const isActive = order.status === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onUpdateStatus(s.id)}
                    disabled={isActive}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? `ring-2 ring-offset-2 ring-primary ${s.color} opacity-100` 
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botão de Estorno Pix (Habilitado para pedidos pagos em preparo/prontos) */}
          {onRefundOrder && ["PREPARING", "READY"].includes(order.status) && (
            <div className="pt-2 border-t border-gray-200">
              {!showRefundConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowRefundConfirm(true)}
                  className="w-full py-2.5 px-4 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span>Cancelar Pedido e Devolver Pix (100%)</span>
                </button>
              ) : (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-3 animate-in fade-in">
                  <div className="text-xs text-red-800">
                    <p className="font-bold mb-1">Confirmar Estorno Integral Pix?</p>
                    <p className="text-red-700">
                      O valor total de <strong>{(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> será estornado instantaneamente para a conta de origem do cliente, os produtos voltarão ao estoque e o pedido será cancelado.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Motivo (ex: cliente desistiu, falta de estoque)"
                    className="w-full px-3 py-1.5 text-xs border border-red-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isRefunding}
                      onClick={async () => {
                        setIsRefunding(true);
                        const success = await onRefundOrder(refundReason);
                        setIsRefunding(false);
                        if (success) {
                          setShowRefundConfirm(false);
                        }
                      }}
                      className="flex-1 py-2 px-3 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isRefunding ? "Processando Estorno..." : "Sim, Devolver 100% via Pix"}
                    </button>
                    <button
                      type="button"
                      disabled={isRefunding}
                      onClick={() => setShowRefundConfirm(false)}
                      className="py-2 px-3 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
