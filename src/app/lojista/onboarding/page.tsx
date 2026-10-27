import { OnboardingForm } from "./onboarding-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configurar Vitrine | SaaS Confeitaria",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md px-4 sm:px-0">
        
        {/* Cabeçalho da página de Onboarding */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-5">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Bem-vindo(a) a bordo!
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            Vamos configurar sua vitrine online para você começar a receber pedidos hoje mesmo.
          </p>
        </div>
        
        {/* Formulário Card */}
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl border border-gray-100">
          <OnboardingForm />
        </div>

      </div>
    </main>
  );
}
