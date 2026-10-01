"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateStoreCustomizationAction } from "@/server/modules/store/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" isLoading={pending}>
      Salvar Alterações
    </Button>
  );
}

export function CustomizationForm({ initialData }: { initialData: any }) {
  const [state, formAction] = useActionState(updateStoreCustomizationAction, null);

  return (
    <form action={formAction} className="space-y-8">
      {/* Alertas de Sucesso ou Erro */}
      {state?.success && (
        <div className="p-4 text-sm font-medium text-green-800 bg-green-50 border border-green-200 rounded-xl">
          {state.message}
        </div>
      )}
      {state?.error && (
        <div className="p-4 text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded-xl">
          {state.error}
        </div>
      )}

      {/* Identidade Visual (Links) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Identidade Visual</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="URL do Logo / Perfil da Loja"
            type="url"
            name="profileUrl"
            defaultValue={initialData.profileUrl || ""}
            placeholder="https://..."
            error={state?.fieldErrors?.profileUrl?.[0]}
          />
          <Input
            label="URL do Banner (Capa)"
            type="url"
            name="bannerUrl"
            defaultValue={initialData.bannerUrl || ""}
            placeholder="https://..."
            error={state?.fieldErrors?.bannerUrl?.[0]}
          />
        </div>
        <p className="text-xs text-gray-500">
          Dica: Em breve teremos upload direto de imagens. Por enquanto, cole o link direto de uma imagem hospedada na web.
        </p>
      </div>

      {/* Cores da Vitrine */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Cores da Vitrine</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor Primária (Botões)</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="colorPrimary" 
                defaultValue={initialData.themeColors?.primary || "#8b5cf6"} 
                className="h-10 w-12 rounded cursor-pointer border-gray-300 p-0 shadow-sm" 
              />
              <span className="text-sm text-gray-500 font-mono">{initialData.themeColors?.primary || "#8b5cf6"}</span>
            </div>
            {state?.fieldErrors?.colorPrimary && <span className="text-xs text-red-600 mt-1">{state.fieldErrors.colorPrimary[0]}</span>}
          </div>
          
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor de Fundo</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="colorBackground" 
                defaultValue={initialData.themeColors?.background || "#ffffff"} 
                className="h-10 w-12 rounded cursor-pointer border-gray-300 p-0 shadow-sm" 
              />
              <span className="text-sm text-gray-500 font-mono">{initialData.themeColors?.background || "#ffffff"}</span>
            </div>
            {state?.fieldErrors?.colorBackground && <span className="text-xs text-red-600 mt-1">{state.fieldErrors.colorBackground[0]}</span>}
          </div>

          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Texto</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                name="colorText" 
                defaultValue={initialData.themeColors?.text || "#111827"} 
                className="h-10 w-12 rounded cursor-pointer border-gray-300 p-0 shadow-sm" 
              />
              <span className="text-sm text-gray-500 font-mono">{initialData.themeColors?.text || "#111827"}</span>
            </div>
            {state?.fieldErrors?.colorText && <span className="text-xs text-red-600 mt-1">{state.fieldErrors.colorText[0]}</span>}
          </div>
        </div>
      </div>

      {/* Estrutura (Layout) */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Estrutura (Layout da Vitrine)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Exibição dos Produtos</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="productView" value="list" defaultChecked={initialData.layoutConfig?.productView !== "grid"} className="text-primary focus:ring-primary w-4 h-4" />
                <span className="text-sm text-gray-700">Lista Simples (Ideal para Delivery)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="productView" value="grid" defaultChecked={initialData.layoutConfig?.productView === "grid"} className="text-primary focus:ring-primary w-4 h-4" />
                <span className="text-sm text-gray-700">Grade de Cards (Foco nas Fotos)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-3">Menu de Categorias</label>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="categoryPosition" value="top" defaultChecked={initialData.layoutConfig?.categoryPosition !== "sidebar"} className="text-primary focus:ring-primary w-4 h-4" />
                <span className="text-sm text-gray-700">Abas Horizontais no Topo</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="categoryPosition" value="sidebar" defaultChecked={initialData.layoutConfig?.categoryPosition === "sidebar"} className="text-primary focus:ring-primary w-4 h-4" />
                <span className="text-sm text-gray-700">Lista Vertical na Lateral</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
