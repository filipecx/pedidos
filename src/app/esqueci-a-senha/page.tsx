import { ForgotPasswordForm } from "./forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recuperar Senha | SaaS Confeitaria",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Recuperar Senha
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-xl sm:px-10 border border-gray-100">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
