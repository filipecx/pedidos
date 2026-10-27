import { RegisterForm } from "./register-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar loja | SaaS Confeitaria",
  description: "Cadastre-se e comece a vender seus produtos online.",
};

export default function CadastroLojistaPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Criar loja
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Comece a receber e gerenciar seus pedidos em minutos.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100">
          <RegisterForm />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Já tem uma conta?
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <a href="/login" className="text-indigo-600 font-medium hover:text-indigo-500">
                Fazer login
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
