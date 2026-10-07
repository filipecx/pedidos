"use client";

import { useState } from "react";
import { updateOrderStatusAction } from "@/server/modules/orders/merchant-queries";
import { OrderModal } from "./order-modal";

export type OrderWithItems = any; // Simplificando por enquanto, você pode extrair o tipo exato depois

export function OrdersDashboardClient({ initialOrders }: { initialOrders: OrderWithItems[] }) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"pronta_entrega" | "encomenda">("pronta_entrega");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // Filtros principais
  const prontaEntregaOrders = orders.filter((o) => o.cartType === "pronta_entrega");
  const encomendaOrders = orders.filter((o) => o.cartType === "encomenda");

  // Status Enum para as colunas de Pronta-Entrega
  const statuses = [
    { id: "PENDING_PAYMENT", label: "Aguardando Pagamento", bg: "bg-gray-100", border: "border-gray-200" },
    { id: "PREPARING", label: "Preparando", bg: "bg-blue-50", border: "border-blue-200" },
    { id: "READY", label: "Pronto / Saiu p/ Entrega", bg: "bg-yellow-50", border: "border-yellow-200" },
    { id: "DELIVERED", label: "Concluído", bg: "bg-green-50", border: "border-green-200" },
  ];

  // Agrupamento de encomendas por dia
  const encomendasGroupedByDate = encomendaOrders.reduce((acc, order) => {
    // Pegar apenas a data (YYYY-MM-DD) do scheduledTime
    const dateStr = order.scheduledTime 
      ? new Date(order.scheduledTime).toLocaleDateString('pt-BR') 
      : 'Sem data';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(order);
    return acc;
  }, {} as Record<string, OrderWithItems[]>);

  // Ordenar os dias
  const sortedDates = Object.keys(encomendasGroupedByDate).sort();

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatusAction(orderId, newStatus as any);
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (e) {
      alert("Erro ao atualizar o status do pedido");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("pronta_entrega")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "pronta_entrega"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Pronta-Entrega ({prontaEntregaOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("encomenda")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "encomenda"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Encomendas ({encomendaOrders.length})
          </button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "pronta_entrega" && (
          <div className="flex flex-row gap-4 md:gap-6 h-full overflow-x-auto p-4 md:p-6 snap-x snap-mandatory">
            {statuses.map((column) => {
              const colOrders = prontaEntregaOrders.filter(o => o.status === column.id);
              return (
                <div key={column.id} className="w-[85vw] md:w-auto md:flex-1 min-w-[280px] md:min-w-[320px] shrink-0 snap-center bg-gray-50/50 rounded-2xl flex flex-col h-full border border-gray-200/60 overflow-hidden">
                  <div className={`p-4 border-b ${column.border} ${column.bg} flex justify-between items-center sticky top-0 z-10`}>
                    <h3 className="font-semibold text-gray-800">{column.label}</h3>
                    <span className="bg-white text-gray-600 text-xs font-bold px-2 py-1 rounded-full border border-gray-200">
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="p-3 flex-1 overflow-y-auto space-y-3">
                    {colOrders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow flex justify-between items-center group"
                      >
                        {/* Mobile view strategy: show order number and basics */}
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-400 mb-1">
                            #{order.id.split('-')[0].toUpperCase()}
                          </span>
                          <span className="font-medium text-gray-900 line-clamp-1">{order.customerName}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {order.items?.length || 0} itens • {(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-primary/5 text-gray-400 group-hover:text-primary transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    {colOrders.length === 0 && (
                      <div className="h-full flex items-center justify-center text-sm text-gray-400 p-6 text-center">
                        Nenhum pedido aqui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "encomenda" && (
          <div className="flex flex-row gap-4 md:gap-6 h-full overflow-x-auto p-4 md:p-6 snap-x snap-mandatory">
            {sortedDates.length === 0 ? (
              <div className="w-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                Você não tem nenhuma encomenda agendada.
              </div>
            ) : (
              sortedDates.map(date => (
                <div key={date} className="w-[85vw] md:w-auto md:flex-1 min-w-[280px] md:min-w-[320px] shrink-0 snap-center bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[700px]">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold text-gray-900">{date}</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {encomendasGroupedByDate[date].length} pedidos
                    </span>
                  </div>
                  <div className="p-3 overflow-y-auto space-y-3 flex-1">
                    {encomendasGroupedByDate[date].map(order => {
                      const timeStr = order.scheduledTime 
                        ? new Date(order.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                        : '--:--';
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="bg-white p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-primary transition-colors flex items-start gap-3"
                        >
                          <div className="bg-gray-50 rounded-lg p-2 min-w-[60px] text-center border border-gray-100 flex flex-col justify-center">
                            <span className="text-xs text-gray-500 uppercase font-semibold">Hora</span>
                            <span className="text-sm font-bold text-gray-900">{timeStr}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-medium text-gray-900 truncate">{order.customerName}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                order.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {order.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 truncate">{order.type === 'DELIVERY' ? 'Entrega' : 'Retirada'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdateStatus={(newStatus) => handleUpdateStatus(selectedOrder.id, newStatus)}
        />
      )}
    </div>
  );
}
