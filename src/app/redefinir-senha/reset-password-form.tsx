"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Token de redefinição não encontrado na URL. Link inválido ou expirado.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setErrorMsg("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      // O BetterAuth espera o newPassword e pega o token que ele injetou (se configurado assim) ou pelo param token
      const { data, error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (error) {
        setErrorMsg(error.message || "Não foi possível redefinir a senha. O link pode ter expirado.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err) {
      setErrorMsg("Erro inesperado. Tente novamente mais tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          Link de recuperação inválido ou inexistente.
        </div>
        <Link href="/esqueci-a-senha" className="text-primary font-medium hover:underline text-sm inline-block mt-4">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto h-16 w-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4 border border-green-100">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">Senha alterada!</h2>
        <p className="text-gray-600 text-sm">
          Sua senha foi redefinida com sucesso. Redirecionando para o login...
        </p>
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
          Digite sua nova senha abaixo.
        </p>
        <div className="space-y-4">
          <Input
            label="Nova Senha"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="No mínimo 8 caracteres"
            disabled={isLoading}
          />
          <Input
            label="Confirme a Nova Senha"
            type="password"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Redefinir Senha
        </Button>
      </div>
    </form>
  );
}
