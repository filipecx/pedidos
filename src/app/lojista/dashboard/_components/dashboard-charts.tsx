"use client";

import { useMemo } from "react";

interface DashboardChartsProps {
  metrics: {
    ordersToday: number;
    revenueTodayCents: number;
    chartData: { date: string; totalCents: number }[];
  };
  activeCount: number;
}

export function DashboardCharts({ metrics, activeCount }: DashboardChartsProps) {
  // Encontra o valor máximo para a escala do gráfico
  const maxVal = useMemo(() => {
    return Math.max(...metrics.chartData.map(d => d.totalCents), 1000); // Mínimo de R$ 10 para escala não ficar zoada
  }, [metrics.chartData]);

  return (
    <>
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <a href="/lojista/pedidos" className="bg-white p-6 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between cursor-pointer ring-1 ring-transparent hover:ring-primary/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary mb-1">Painel de Pedidos</h3>
            <p className="text-xs text-gray-500">Gerenciar Entregas e Encomendas</p>
          </div>
          <div className="mt-4 flex items-center text-sm font-medium text-primary">
            Acessar <span className="ml-1 group-hover:translate-x-1 transition-transform">&rarr;</span>
          </div>
        </a>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Pedidos Hoje</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.ordersToday}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Faturamento Hoje</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {(metrics.revenueTodayCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Produtos Ativos</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{activeCount}</p>
        </div>
      </div>

      {/* Gráfico de Faturamento (Últimos 7 dias) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Faturamento (Últimos 7 Dias)</h3>
        
        <div className="flex items-end justify-between gap-1 sm:gap-2 h-48 mt-6">
          {metrics.chartData.map((data, index) => {
            const heightPercent = Math.max((data.totalCents / maxVal) * 100, 2); // Mínimo 2% de altura pra barra não sumir
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 h-full group justify-end relative">
                {/* Tooltip rudimentar hover */}
                <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-6 text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {(data.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                
                {/* Barra */}
                <div className="w-full max-w-[40px] bg-primary/10 rounded-t-md group-hover:bg-primary/20 transition-colors relative flex-1 flex items-end">
                  <div 
                    className="w-full bg-primary rounded-t-md transition-all duration-500 ease-out" 
                    style={{ height: `${heightPercent}%` }}
                  ></div>
                </div>
                
                {/* Legenda (Data) */}
                <span className="text-[9px] sm:text-xs font-medium text-gray-500 mt-2 truncate w-full text-center">
                  {data.date}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
