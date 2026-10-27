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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Impede o envio nativo do formulário

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

      const role = (data?.user as any)?.role;
      if (role === "ADMIN") {
        router.push("/admin");
      } else if (role === "LOJISTA") {
        router.push("/lojista/dashboard");
      } else {
        router.push("/");
      }
    } catch (err) {
      setErrorMsg("Ocorreu um erro inesperado. Tente novamente mais tarde.");
      setIsLoading(false);
    }
  };

  return (
    <form 
      onSubmit={handleLogin} 
      method="POST" 
      action="/api/auth/sign-in/email"
      className="space-y-5"
      onSubmitCapture={(e) => {
        // Double check prevention even in capture phase
        e.preventDefault();
      }}
    >
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
        placeholder="seuemail@exemplo.com"
        disabled={isLoading}
      />

      <div>
        <div className="flex justify-between items-center mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <a href="/esqueci-a-senha" className="text-sm font-medium text-primary hover:underline">
            Esqueci a senha
          </a>
        </div>
        <Input
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <div className="pt-2">
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full"
        >
          Entrar
        </Button>
      </div>
    </form>
  );
}
