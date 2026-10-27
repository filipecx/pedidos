import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Venda Online e Gerencie seus Pedidos | Sem Mensalidade",
  description: "Crie sua vitrine virtual, receba pagamentos via PIX na hora e gerencie pedidos de pronta-entrega e encomendas sem mensalidade fixa.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col selection:bg-purple-100 selection:text-purple-700">
      {/* NAVBAR */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-sm shadow-purple-200">
              P
            </span>
            <span className="font-extrabold text-xl tracking-tight text-gray-900">
              Pedidos<span className="text-purple-600">SaaS</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3.5 py-2 rounded-xl transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro-lojista"
              className="text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl shadow-md shadow-purple-200 transition-all hover:shadow-lg"
            >
              Criar Loja Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1">
        <section className="pt-16 pb-20 px-4 max-w-4xl mx-auto text-center">
          {/* BADGE DA PROPAGANDA */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/60 text-purple-700 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
            <span>✨ Sem mensalidade</span>
            <span className="text-gray-300">•</span>
            <span>Apenas R$ 1 por venda</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
            Venda online e gerencie seus pedidos{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              sem pagar mensalidade.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Tenha seu próprio cardápio digital para celular. Receba pagamentos no <strong>PIX na hora</strong>, organize pronta-entrega e encomendas, e atenda pelo WhatsApp com agilidade.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-6">
            <Link
              href="/cadastro-lojista"
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white text-base font-bold rounded-2xl shadow-xl shadow-purple-300/40 transition-all transform hover:-translate-y-0.5"
            >
              Começar Agora Mesmo ➔
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-base font-semibold rounded-2xl border border-gray-200 transition-all"
            >
              Já tenho conta
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            Sem cartão de crédito • Criação em 2 minutos • Comece grátis
          </p>
        </section>

        {/* BENEFÍCIOS RÁPIDOS */}
        <section className="py-12 bg-gray-50/70 border-y border-gray-100">
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-lg mb-4">
                📱
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-2">Cardápio Próprio e Rápido</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Seus clientes compram pelo celular com link direto da sua loja, sem precisar baixar aplicativos pesados.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center text-lg mb-4">
                ⚡
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-2">PIX Automatizado na Hora</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                O cliente paga e o pedido cai no seu painel já confirmado, com som de notificação e sem comprovantes falsos.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center text-lg mb-4">
                🏷️
              </div>
              <h3 className="font-bold text-gray-900 text-base mb-2">Risco Zero: R$ 1 por Venda</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Você só paga quando vender. Sem contratos, sem taxas de adesão e sem surpresas no fim do mês.
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-20 px-4 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
            Pronto para profissionalizar seus pedidos?
          </h2>
          <p className="text-gray-600 mb-8 text-sm sm:text-base">
            Junte-se a confeiteiros e pequenos empreendedores que economizam horas de atendimento diário.
          </p>
          <Link
            href="/cadastro-lojista"
            className="inline-block px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200 transition-all"
          >
            Cadastrar Minha Loja Grátis
          </Link>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8 text-center text-xs text-gray-400">
        <p>© {new Date().getFullYear()} PedidosSaaS. A plataforma de vendas para quem faz e vende com amor.</p>
      </footer>
    </div>
  );
}
