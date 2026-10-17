"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  updateOrderStatusAction, 
  getMerchantArchivedOrders, 
  refundOrderAction,
  completeAllDispatchedOrdersAction 
} from "@/server/modules/orders/merchant-queries";
import { OrderModal } from "./order-modal";
import { toast } from "@/lib/toast-store";

export type OrderWithItems = any; // Simplificando por enquanto, você pode extrair o tipo exato depois

export function OrdersDashboardClient({ initialOrders }: { initialOrders: OrderWithItems[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<"pronta_entrega" | "encomenda" | "historico">("pronta_entrega");
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  // Histórico de pedidos arquivados (sob demanda)
  const [archivedOrders, setArchivedOrders] = useState<OrderWithItems[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [archivedPage, setArchivedPage] = useState(1);
  const [hasMoreArchived, setHasMoreArchived] = useState(true);

  // Controle de colapso visual da coluna de Concluídos do dia (para despoluir a visão do lojista)
  const [showDeliveredColumn, setShowDeliveredColumn] = useState(true);

  // Sincronizar com os dados do servidor quando der refresh
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  // Carregar histórico de pedidos anteriores quando a aba histórico for aberta
  useEffect(() => {
    if (activeTab === "historico" && archivedOrders.length === 0 && !isLoadingArchived) {
      loadArchivedOrders(1);
    }
  }, [activeTab]);

  const loadArchivedOrders = async (page: number) => {
    setIsLoadingArchived(true);
    try {
      const data = await getMerchantArchivedOrders(page, 20);
      if (page === 1) {
        setArchivedOrders(data);
      } else {
        setArchivedOrders(prev => [...prev, ...data]);
      }
      setArchivedPage(page);
      if (data.length < 20) {
        setHasMoreArchived(false);
      }
    } catch (e) {
      console.error("Erro ao buscar histórico", e);
    } finally {
      setIsLoadingArchived(false);
    }
  };

  // Badges de notificação de novos pedidos recebidos via SSE enquanto em outra aba
  const [unreadCounts, setUnreadCounts] = useState<{ pronta_entrega: number; encomenda: number }>({
    pronta_entrega: 0,
    encomenda: 0,
  });

  // Limpar a notificação da aba que o usuário clicar
  const handleSelectTab = (tab: "pronta_entrega" | "encomenda" | "historico") => {
    setActiveTab(tab);
    if (tab === "pronta_entrega") {
      setUnreadCounts((prev) => ({ ...prev, pronta_entrega: 0 }));
    } else if (tab === "encomenda") {
      setUnreadCounts((prev) => ({ ...prev, encomenda: 0 }));
    }
  };

  // Conexão SSE para Real-Time
  useEffect(() => {
    const eventSource = new EventSource("/api/sse/orders");

    eventSource.onmessage = (event) => {};

    eventSource.addEventListener("new_order", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "REFRESH") {
          const currentTab = activeTabRef.current;
          // Atualiza contadores de notificações caso o pedido seja da outra aba
          if (data.cartType === "encomenda" && currentTab !== "encomenda") {
            setUnreadCounts((prev) => ({ ...prev, encomenda: prev.encomenda + 1 }));
          } else if (data.cartType === "pronta_entrega" && currentTab !== "pronta_entrega") {
            setUnreadCounts((prev) => ({ ...prev, pronta_entrega: prev.pronta_entrega + 1 }));
          }

          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.5, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.5);
            }
          } catch (e) {
            console.log("Erro ao tocar som", e);
          }

          router.refresh();
        }
      } catch (err) {
        console.error("Erro no SSE parse", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [router]);

  // Filtros principais (apenas operacionais de hoje em diante)
  const prontaEntregaOrders = orders.filter((o) => o.cartType === "pronta_entrega");
  const encomendaOrders = orders.filter((o) => o.cartType === "encomenda");

  // Seções operacionais da Pronta-Entrega:
  // 1. Aguardando Pagamento (se houver)
  // 2. Preparando (Cozinha)
  // 3. Pronto (Retirada no Balcão) - READY + PICKUP
  // 4. Despachado (Em Rota de Entrega) - READY + DELIVERY
  // Concluídos vão automaticamente para o Histórico de Concluídos
  const operationalSections = [
    {
      id: "PENDING_PAYMENT",
      label: "Aguardando Pagamento",
      bg: "bg-gray-100",
      border: "border-gray-200",
      filter: (o: OrderWithItems) => o.status === "PENDING_PAYMENT",
    },
    {
      id: "PREPARING",
      label: "Preparando (Cozinha)",
      bg: "bg-blue-50",
      border: "border-blue-200",
      filter: (o: OrderWithItems) => o.status === "PREPARING",
    },
    {
      id: "READY_PICKUP",
      label: "Pronto",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "🛍️",
      filter: (o: OrderWithItems) => o.status === "READY" && o.type === "PICKUP",
    },
    {
      id: "READY_DELIVERY",
      label: "Pronto",
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "🛵",
      filter: (o: OrderWithItems) => o.status === "READY" && o.type === "DELIVERY",
    },
  ];

  // Agrupamento de encomendas por dia
  const encomendasGroupedByDate = encomendaOrders.reduce((acc, order) => {
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
      
      // Se concluiu (DELIVERED) ou cancelou (CANCELED), remove da lista operacional do dia
      if (newStatus === "DELIVERED" || newStatus === "CANCELED") {
        setOrders(orders.filter(o => o.id !== orderId));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(null);
        }
        toast.success(newStatus === "DELIVERED" ? "Pedido concluído e arquivado no histórico!" : "Pedido cancelado.");
      } else {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        toast.success("Status do pedido atualizado com sucesso!");
      }
    } catch (e) {
      toast.error("Erro ao atualizar o status do pedido");
    }
  };

  const handleRefundOrder = async (orderId: string, reason?: string) => {
    try {
      const res = await refundOrderAction(orderId, reason);
      if (!res.success) {
        toast.error(res.error || "Não foi possível estornar o pedido.");
        return false;
      }
      // Ao estornar/cancelar, remove da visualização operacional ativa
      setOrders(orders.filter(o => o.id !== orderId));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
      toast.success("Estorno realizado com sucesso! O valor foi devolvido ao cliente.");
      return true;
    } catch (e: any) {
      toast.error(e?.message || "Erro inesperado ao realizar estorno.");
      return false;
    }
  };

  const handleCompleteAllDispatched = async () => {
    try {
      const res = await completeAllDispatchedOrdersAction();
      if (!res.success) {
        toast.error(res.error || "Erro ao concluir pedidos despachados");
        return;
      }
      // Remove todos os pedidos que eram READY + DELIVERY
      setOrders(orders.filter(o => !(o.status === "READY" && o.type === "DELIVERY")));
      toast.success(`${res.count} pedidos despachados foram concluídos e arquivados!`);
    } catch (e) {
      toast.error("Erro ao concluir pedidos despachados");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Abas */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          <button
            onClick={() => handleSelectTab("pronta_entrega")}
            className={`relative py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "pronta_entrega"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>Pronta-Entrega ({prontaEntregaOrders.length})</span>
            {unreadCounts.pronta_entrega > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
                {unreadCounts.pronta_entrega}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelectTab("encomenda")}
            className={`relative py-4 px-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === "encomenda"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <span>Encomendas ({encomendaOrders.length})</span>
            {unreadCounts.encomenda > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
                {unreadCounts.encomenda}
              </span>
            )}
          </button>

          <button
            onClick={() => handleSelectTab("historico")}
            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "historico"
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Histórico de Concluídos
          </button>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "pronta_entrega" && (
          <div className="flex flex-col gap-6 h-full overflow-y-auto p-4 md:p-6">
            {operationalSections.map((section) => {
              const colOrders = prontaEntregaOrders.filter(section.filter);

              // Se não houver pedidos aguardando pagamento, não ocupa espaço desnecessário
              if (section.id === "PENDING_PAYMENT" && colOrders.length === 0) {
                return null;
              }

              return (
                <div key={section.id} className="w-full shrink-0 bg-gray-50/50 rounded-2xl flex flex-col border border-gray-200/60 overflow-hidden">
                  <div className={`p-4 border-b ${section.border} ${section.bg} flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                      {section.icon && <span className="text-base">{section.icon}</span>}
                      <h3 className="font-semibold text-gray-800">{section.label}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.id === "READY_DELIVERY" && colOrders.length > 0 && (
                        <button
                          type="button"
                          onClick={handleCompleteAllDispatched}
                          className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-green-50 text-green-700 border border-green-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Concluir Todos</span>
                        </button>
                      )}
                      <span className="bg-white text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 shadow-2xs">
                        {colOrders.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 pt-3 pb-6 scroll-padding-left-4">
                    {colOrders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="w-40 h-32 sm:w-48 sm:h-36 shrink-0 snap-start bg-white p-3 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
                      >
                        <div className="flex flex-col">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-gray-400">
                              #{order.id.split('-')[0].toUpperCase()}
                            </span>
                            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                              {order.type === "DELIVERY" ? "Entrega" : "Balcão"}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 line-clamp-2 leading-tight text-sm">
                            {order.customerName}
                          </span>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400">{order.items?.length || 0} itens</span>
                            <span className="text-xs font-bold text-gray-700">
                              {(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                          <div className="bg-gray-50 p-1.5 rounded-lg text-gray-400 group-hover:text-primary transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                    {colOrders.length === 0 && (
                      <div className="h-28 flex w-full items-center justify-center text-sm text-gray-400 text-center">
                        Nenhum pedido nesta etapa
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "encomenda" && (
          <div className="flex flex-col gap-6 h-full overflow-y-auto p-4 md:p-6">
            {sortedDates.length === 0 ? (
              <div className="w-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                Você não tem nenhuma encomenda agendada para hoje em diante.
              </div>
            ) : (
              sortedDates.map(date => (
                <div key={date} className="w-full shrink-0 bg-gray-50/50 rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">{date}</h3>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      {encomendasGroupedByDate[date].length} pedidos
                    </span>
                  </div>
                  <div className="flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none px-4 pt-3 pb-6 scroll-padding-left-4">
                    {encomendasGroupedByDate[date].map((order: OrderWithItems) => {
                      const timeStr = order.scheduledTime 
                        ? new Date(order.scheduledTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                        : '--:--';
                      return (
                        <div 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="w-44 h-36 sm:w-52 sm:h-40 shrink-0 snap-start bg-white p-3 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-primary hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="bg-primary/5 rounded-md px-2 py-1 border border-primary/10">
                              <span className="text-[10px] text-primary uppercase font-bold block leading-none mb-0.5">Hora</span>
                              <span className="text-sm font-bold text-primary leading-none">{timeStr}</span>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                order.status === 'PENDING_PAYMENT' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {order.status === 'PENDING_PAYMENT' ? 'AG. PAG.' : 
                                 order.status === 'PREPARING' ? 'PREPARO' : 
                                 order.status === 'READY' ? 'PRONTO' : 
                                 order.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-col">
                            <p className="font-medium text-gray-900 line-clamp-1 text-sm">{order.customerName}</p>
                            <p className="text-[10px] text-gray-500 truncate">{order.type === 'DELIVERY' ? 'Entrega' : 'Retirada'}</p>
                          </div>
                          
                          <div className="mt-auto flex justify-between items-end border-t border-gray-50 pt-2">
                            <span className="text-xs font-bold text-gray-800">
                              {(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            <span className="text-[10px] text-gray-400">#{order.id.split('-')[0].toUpperCase()}</span>
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

        {activeTab === "historico" && (
          <div className="flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Histórico de Pedidos Finalizados</h2>
                <p className="text-xs text-gray-500">Pedidos concluídos ou cancelados de datas anteriores a hoje, carregados sob demanda para não sobrecarregar sua rotina.</p>
              </div>
            </div>

            {archivedOrders.length === 0 && !isLoadingArchived ? (
              <div className="w-full text-center py-12 text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                Nenhum pedido finalizado no histórico anterior.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {archivedOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="p-4 hover:bg-gray-50/80 transition-colors cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {order.status === 'DELIVERED' ? 'Concluído' : 'Cancelado'}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{order.customerName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-gray-400">
                              #{order.id.split('-')[0].toUpperCase()} • {new Date(order.createdAt).toLocaleDateString('pt-BR')} às {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {order.completionNotes && (
                              <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                🤖 {order.completionNotes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-gray-900 text-sm block">
                          {(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <span className="text-xs text-gray-400">
                          {order.cartType === 'pronta_entrega' ? 'Pronta-Entrega' : 'Encomenda'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreArchived && (
                  <div className="p-4 border-t border-gray-100 text-center">
                    <button
                      onClick={() => loadArchivedOrders(archivedPage + 1)}
                      disabled={isLoadingArchived}
                      className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
                    >
                      {isLoadingArchived ? "Carregando mais..." : "Carregar mais pedidos antigos"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderModal 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
          onUpdateStatus={(newStatus) => handleUpdateStatus(selectedOrder.id, newStatus)}
          onRefundOrder={(reason) => handleRefundOrder(selectedOrder.id, reason)}
        />
      )}
    </div>
  );
}
