"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { data, error } = await signIn.email({ email, password });

      if (error) {
        setErrorMsg(error.message || "Credenciais inválidas. Verifique seu e-mail e senha.");
        setIsLoading(false);
        return;
      }

      // Roteamento inteligente baseado no papel do usuário
      const role = data?.user?.role;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "LOJISTA") {
        router.push("/lojista");
      } else {
        router.push("/");
      }
      
      // router.push já engatilha a transição, mas Next.js pode demorar uns milissegundos
      // Manter o botão em loading até desmontar previne duplos cliques
    } catch (err) {
      setErrorMsg("Ocorreu um erro inesperado. Tente novamente mais tarde.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {errorMsg}
        </div>
      )}

      <Input
        label="E-mail"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="admin@email.com"
        disabled={isLoading}
      />

      <Input
        label="Senha"
        type="password"
        name="password"
        required
        autoComplete="current-password"
        disabled={isLoading}
      />

      <div className="pt-2">
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isLoading} 
          className="w-full"
        >
          Entrar
        </Button>
      </div>
    </form>
  );
}
