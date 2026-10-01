"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createStoreAction } from "@/server/modules/store/actions";
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
      Concluir e Ir para o Dashboard
    </Button>
  );
}

export function OnboardingForm() {
  const [state, formAction] = useActionState(createStoreAction, null);
  const [slugVal, setSlugVal] = useState("");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    
    // Converte o nome digitado para um slug automático amigável
    const generatedSlug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]+/g, "-")      // Substitui espaços por hífens
      .replace(/(^-|-$)+/g, "");        // Remove hífens sobrando nas pontas
    
    setSlugVal(generatedSlug);
  };

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {state.error}
        </div>
      )}
      
      <Input
        label="Nome da sua loja"
        type="text"
        name="name"
        required
        placeholder="Ex: Doces da Maria"
        onChange={handleNameChange}
        error={state?.fieldErrors?.name?.[0]}
      />

      <div>
        <Input
          label="Link da sua vitrine"
          type="text"
          name="slug"
          required
          value={slugVal}
          onChange={(e) => setSlugVal(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="doces-da-maria"
          error={state?.fieldErrors?.slug?.[0]}
        />
        <p className="mt-2 text-sm text-gray-500">
          Seu link será: <span className="font-medium text-primary">app.com/{slugVal || "sua-loja"}</span>
        </p>
      </div>

      <div className="pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
