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

import { useState, useRef } from "react";
import { toast } from "@/lib/toast-store";

export function CustomizationForm({ initialData }: { initialData: any }) {
  const [state, formAction] = useActionState(updateStoreCustomizationAction, null);

  const [profilePreview, setProfilePreview] = useState<string | null>(initialData.profileUrl || null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [bannerPreview, setBannerPreview] = useState<string | null>(initialData.bannerUrl || null);
  const [isNewBanner, setIsNewBanner] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("O logo/perfil deve ter no máximo 10MB.");
        e.target.value = "";
        return;
      }
      setProfilePreview(URL.createObjectURL(file));
      setIsNewProfile(true);
    }
  };

  const handleClearProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (profileInputRef.current) {
      profileInputRef.current.value = "";
    }
    setProfilePreview(initialData.profileUrl || null);
    setIsNewProfile(false);
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toast.error("O banner deve ter no máximo 10MB.");
        e.target.value = "";
        return;
      }
      setBannerPreview(URL.createObjectURL(file));
      setIsNewBanner(true);
    }
  };

  const handleClearBanner = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (bannerInputRef.current) {
      bannerInputRef.current.value = "";
    }
    setBannerPreview(initialData.bannerUrl || null);
    setIsNewBanner(false);
  };

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
          {/* Logo / Foto de Perfil */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Logo / Perfil da Loja
            </label>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 shadow-xs group">
                {profilePreview ? (
                  <img
                    src={profilePreview}
                    alt="Logo da Loja"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] mt-1">Sem logo</span>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="relative inline-block w-full">
                  <input
                    ref={profileInputRef}
                    type="file"
                    name="profileImage"
                    id="profileImage"
                    accept="image/*"
                    onChange={handleProfileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full py-2.5 px-3 text-xs font-semibold text-center text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs">
                    {profilePreview ? "Alterar Logo" : "Selecionar Logo"}
                  </div>
                </div>

                {isNewProfile && (
                  <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    <span>Nova logo selecionada</span>
                    <button
                      type="button"
                      onClick={handleClearProfile}
                      className="text-xs text-red-600 hover:underline font-medium ml-2 cursor-pointer"
                    >
                      Desfazer
                    </button>
                  </div>
                )}
                {!isNewProfile && initialData.profileUrl && (
                  <p className="text-xs text-gray-500">Logo atual da sua vitrine.</p>
                )}
              </div>
            </div>

            {(state?.fieldErrors as any)?.profileImage?.[0] && (
              <p className="text-xs text-red-500 font-medium">{(state?.fieldErrors as any)?.profileImage[0]}</p>
            )}
          </div>
          
          {/* Banner (Capa) */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Banner da Loja (Capa)
            </label>

            <div className="space-y-2">
              <div className="relative w-full h-28 rounded-2xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shadow-xs group">
                {bannerPreview ? (
                  <img
                    src={bannerPreview}
                    alt="Banner da Loja"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs mt-1">Nenhum banner cadastrado</span>
                  </div>
                )}

                <input
                  ref={bannerInputRef}
                  type="file"
                  name="bannerImage"
                  id="bannerImage"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <span className="text-xs font-semibold text-white bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-xs">
                    Clique para trocar o banner
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                {isNewBanner ? (
                  <div className="flex items-center justify-between w-full text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                    <span>Novo banner selecionado</span>
                    <button
                      type="button"
                      onClick={handleClearBanner}
                      className="text-xs text-red-600 hover:underline font-medium ml-2 cursor-pointer"
                    >
                      Desfazer
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    {initialData.bannerUrl ? "Banner atual da sua vitrine." : "Envie uma imagem panorâmica para destacar sua loja."}
                  </p>
                )}
              </div>
            </div>

            {(state?.fieldErrors as any)?.bannerImage?.[0] && (
              <p className="text-xs text-red-500 font-medium">{(state?.fieldErrors as any)?.bannerImage[0]}</p>
            )}
          </div>
        </div>

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

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-800 mb-3">Aba Inicial Padrão</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="defaultTab" value="pronta_entrega" defaultChecked={initialData.layoutConfig?.defaultTab !== "encomenda"} className="text-primary focus:ring-primary w-4 h-4" />
                <div>
                  <span className="text-sm font-medium text-gray-800 block">Pronta-Entrega</span>
                  <span className="text-xs text-gray-500">Abre primeiro os itens para entrega imediata</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <input type="radio" name="defaultTab" value="encomenda" defaultChecked={initialData.layoutConfig?.defaultTab === "encomenda"} className="text-primary focus:ring-primary w-4 h-4" />
                <div>
                  <span className="text-sm font-medium text-gray-800 block">Encomenda</span>
                  <span className="text-xs text-gray-500">Abre primeiro os itens com agendamento</span>
                </div>
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
