import { ResetPasswordForm } from "./reset-password-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Redefinir Senha | SaaS Confeitaria",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Escolha uma nova senha
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100">
          {/* Suspense is required when using useSearchParams in a Client Component */}
          <Suspense fallback={<div className="text-center text-sm text-gray-500">Carregando...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
