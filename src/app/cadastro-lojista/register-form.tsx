"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { registerLojistaAction } from "@/server/modules/lojista/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TermsModal } from "@/components/legal/terms-modal";

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
  const [state, formAction] = useActionState(registerLojistaAction, null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  return (
    <>
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

        {/* Checkbox de Aceite dos Termos de Uso (Clickwrap Agreement) */}
        <div className="space-y-1 pt-1">
          <div className="flex items-start gap-3">
            <input
              id="acceptTerms"
              name="acceptTerms"
              type="checkbox"
              checked={isTermsAccepted}
              onChange={(e) => setIsTermsAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-primary"
            />
            <label htmlFor="acceptTerms" className="text-xs text-gray-600 leading-normal select-none">
              Li e concordo com os{" "}
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(true)}
                className="font-semibold text-primary hover:underline focus:outline-hidden"
              >
                Termos de Uso e Contrato de Licenciamento SaaS
              </button>{" "}
              da plataforma.
            </label>
          </div>
          {state?.fieldErrors?.acceptTerms?.[0] && (
            <p className="text-xs text-red-500 font-medium">
              {state.fieldErrors.acceptTerms[0]}
            </p>
          )}
        </div>

        <div className="pt-2">
          <SubmitButton />
        </div>
      </form>

      {/* Modal Interativo de Leitura dos Termos */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setIsTermsAccepted(true)}
      />
    </>
  );
}
