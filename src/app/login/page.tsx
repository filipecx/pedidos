import { LoginForm } from "./login-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login | SaaS Confeitaria",
  description: "Faça login na sua conta para acessar seu painel.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Acesse sua conta
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gerencie sua loja ou administre a plataforma.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100">
          <LoginForm />
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Ainda não tem uma loja?
                </span>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link href="/cadastro-lojista" className="text-primary font-medium hover:text-primary/80">
                Criar uma conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
