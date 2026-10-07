"use client";

import { useEffect } from "react";
import type { OrderWithItems } from "./orders-dashboard-client";

interface OrderModalProps {
  order: OrderWithItems;
  onClose: () => void;
  onUpdateStatus: (newStatus: string) => void;
}

export function OrderModal({ order, onClose, onUpdateStatus }: OrderModalProps) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const statuses = [
    { id: "PENDING_PAYMENT", label: "Aguardando Pagamento", color: "text-gray-600 bg-gray-100" },
    { id: "PREPARING", label: "Preparando", color: "text-blue-700 bg-blue-100" },
    { id: "READY", label: "Pronto / Saiu p/ Entrega", color: "text-yellow-700 bg-yellow-100" },
    { id: "DELIVERED", label: "Concluído", color: "text-green-700 bg-green-100" },
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
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(order.createdAt).toLocaleString('pt-BR')}
            </p>
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
              <div className="flex justify-between">
                <span className="text-gray-500">Telefone:</span>
                <span className="font-medium text-gray-900">{order.customerPhone}</span>
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
                  <p className="font-medium text-gray-900 text-sm">
                    {/* Exemplo de parse seguro, dependendo de como o JSONB tá salvo */}
                    {typeof order.deliveryAddress === 'string' 
                      ? order.deliveryAddress 
                      : JSON.stringify(order.deliveryAddress)}
                  </p>
                </div>
              )}
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

        {/* Rodapé - Ações de Status */}
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Atualizar Status</label>
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
      </div>
    </div>
  );
}
