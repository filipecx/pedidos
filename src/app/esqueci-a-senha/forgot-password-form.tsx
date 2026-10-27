"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await (authClient as any).forgetPassword({
        email,
        redirectTo: "/redefinir-senha", // Será tratado pelo BetterAuth, que vai injetar o token
      });

      if (error) {
        setErrorMsg(error.message || "Ocorreu um erro ao enviar o e-mail.");
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setErrorMsg("Erro inesperado. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">E-mail enviado!</h2>
          <p className="text-gray-600 text-sm">
            Se uma conta com o e-mail <strong>{email}</strong> existir, um link de recuperação foi enviado. Verifique sua caixa de entrada.
          </p>
        </div>
        <div className="pt-4">
          <Link href="/login" className="text-primary font-medium hover:underline text-sm">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} method="POST" action="javascript:void(0)" className="space-y-5">
      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {errorMsg}
        </div>
      )}

      <div>
        <p className="text-sm text-gray-600 mb-4">
          Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
        </p>
        <Input
          label="E-mail"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="seu@email.com"
          disabled={isLoading}
        />
      </div>

      <div className="pt-2 flex flex-col gap-3">
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Enviar Link
        </Button>
        <Link href="/login" className="text-center text-sm font-medium text-gray-500 hover:text-gray-900">
          Voltar para o login
        </Link>
      </div>
    </form>
  );
}
