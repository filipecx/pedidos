import type { Metadata } from "next";
import Link from "next/link";
import { TermsContent } from "@/components/legal/terms-content";

export const metadata: Metadata = {
  title: "Termos de Uso e Licenciamento | SaaS",
  description: "Contrato de licenciamento de software SaaS e termos de uso para lojistas.",
};

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-200">
        <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
          <Link
            href="/cadastro-lojista"
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5"
          >
            &larr; Voltar para o Cadastro
          </Link>
          <span className="text-xs text-gray-400 font-mono">Documento Oficial</span>
        </div>

        <TermsContent />

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <Link
            href="/cadastro-lojista"
            className="px-6 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm"
          >
            Voltar e Continuar Cadastro
          </Link>
        </div>
      </div>
    </div>
  );
}
