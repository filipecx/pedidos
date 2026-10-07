"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg("Preencha e-mail e senha.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await signIn.email({ email, password });

      if (error) {
        setErrorMsg(error.message || "Credenciais inválidas. Verifique seu e-mail e senha.");
        setIsLoading(false);
        return;
      }

      const role = data?.user?.role;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "LOJISTA") {
        router.push("/lojista");
      } else {
        router.push("/");
      }
    } catch (err) {
      setErrorMsg("Ocorreu um erro inesperado. Tente novamente mais tarde.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="space-y-5" onKeyDown={handleKeyDown}>
      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {errorMsg}
        </div>
      )}

      <Input
        label="E-mail"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="admin@email.com"
        disabled={isLoading}
      />

      <Input
        label="Senha"
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
        disabled={isLoading}
      />

      <div className="pt-2">
        <Button 
          type="button" 
          variant="primary" 
          isLoading={isLoading}
          disabled={!mounted || isLoading}
          onClick={handleLogin}
          className="w-full"
        >
          Entrar
        </Button>
      </div>
    </div>
  );
}
