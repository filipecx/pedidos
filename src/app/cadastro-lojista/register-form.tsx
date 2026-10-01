"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerLojistaAction } from "@/server/modules/lojista/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      variant="primary" 
      isLoading={pending} 
      className="w-full"
    >
      Criar minha conta
    </Button>
  );
}

export function RegisterForm() {
  // Hook do React 19 para conectar o formulário à nossa Server Action
  const [state, formAction] = useActionState(registerLojistaAction, null);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {state.error}
        </div>
      )}
      
      <Input
        label="Nome (Seu nome ou da loja)"
        type="text"
        name="name"
        required
        autoComplete="name"
        placeholder="Ex: Doces da Maria"
        error={state?.fieldErrors?.name?.[0]}
      />

      <Input
        label="E-mail"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="voce@exemplo.com"
        error={state?.fieldErrors?.email?.[0]}
      />

      <Input
        label="WhatsApp (Opcional)"
        type="tel"
        name="phone"
        autoComplete="tel"
        placeholder="(11) 99999-9999"
        error={state?.fieldErrors?.phone?.[0]}
      />

      <Input
        label="Senha"
        type="password"
        name="password"
        required
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
        error={state?.fieldErrors?.password?.[0]}
      />

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
