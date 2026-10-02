"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Category } from "@/db/schema/categories";
import { createFullComboAction, FullComboPayload } from "@/server/modules/products/actions";

export function ComboCreatorClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payload, setPayload] = useState<FullComboPayload>({
    name: "",
    description: "",
    basePriceCents: 0,
    groups: [],
  });

  // Estado auxiliar para os inputs de preço em R$
  const [basePriceInput, setBasePriceInput] = useState("");

  const addGroup = () => {
    setPayload(p => ({
      ...p,
      groups: [
        ...p.groups,
        { name: "", isRequired: true, minChoices: 1, maxChoices: 1, items: [] }
      ]
    }));
  };

  const updateGroup = (gIndex: number, field: string, value: any) => {
    setPayload(p => {
      const newGroups = [...p.groups];
      newGroups[gIndex] = { ...newGroups[gIndex], [field]: value };
      return { ...p, groups: newGroups };
    });
  };

  const removeGroup = (gIndex: number) => {
    setPayload(p => {
      const newGroups = [...p.groups];
      newGroups.splice(gIndex, 1);
      return { ...p, groups: newGroups };
    });
  };

  const addItem = (gIndex: number) => {
    setPayload(p => {
      const newGroups = [...p.groups];
      const newItems = [...(newGroups[gIndex].items || [])];
      newItems.push({ name: "", additionalPriceCents: 0 });
      newGroups[gIndex] = { ...newGroups[gIndex], items: newItems };
      return { ...p, groups: newGroups };
    });
  };

  const updateItem = (gIndex: number, iIndex: number, field: string, value: any) => {
    setPayload(p => {
      const newGroups = [...p.groups];
      const newItems = [...(newGroups[gIndex].items || [])];
      newItems[iIndex] = { ...newItems[iIndex], [field]: value };
      newGroups[gIndex] = { ...newGroups[gIndex], items: newItems };
      return { ...p, groups: newGroups };
    });
  };

  const removeItem = (gIndex: number, iIndex: number) => {
    setPayload(p => {
      const newGroups = [...p.groups];
      const newItems = [...(newGroups[gIndex].items || [])];
      newItems.splice(iIndex, 1);
      newGroups[gIndex] = { ...newGroups[gIndex], items: newItems };
      return { ...p, groups: newGroups };
    });
  };

  const handleSave = async () => {
    if (!payload.name) {
      setError("Preencha o nome do combo.");
      return;
    }
    
    // Converter preço base
    const parsedBase = Math.round(parseFloat(basePriceInput.replace(',', '.')) * 100) || 0;
    
    setIsLoading(true);
    setError(null);

    const finalPayload = {
      ...payload,
      basePriceCents: parsedBase,
    };

    const res = await createFullComboAction(finalPayload);
    if (!res.success) {
      setError(res.error || "Ocorreu um erro ao salvar o combo.");
      setIsLoading(false);
      return;
    }

    alert("Combo Criado com sucesso!");
    router.push("/lojista/combos");
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          {error}
        </div>
      )}

      {/* Cartão 1: Informações Básicas */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">1. Detalhes do Combo</h2>
        <div className="space-y-4">
          <Input 
            label="Nome do Combo" 
            placeholder="Ex: Combo Família Feliz"
            value={payload.name}
            onChange={e => setPayload({...payload, name: e.target.value})}
          />
          <Input 
            label="Preço Base (R$)" 
            placeholder="Ex: 50,00"
            value={basePriceInput}
            onChange={e => setBasePriceInput(e.target.value)}
          />
          <Input 
            label="Descrição" 
            placeholder="O que vem nesse combo?"
            value={payload.description || ""}
            onChange={e => setPayload({...payload, description: e.target.value})}
          />
        </div>
      </div>

      {/* Cartão 2: Passos (Modificadores) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">2. Passos do Cliente</h2>
        </div>
        
        {payload.groups.length === 0 && (
          <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-gray-500">
            Nenhum passo adicionado. <br/>Ex: "Escolha 2 Refrigerantes"
          </div>
        )}

        {payload.groups.map((group, gIndex) => (
          <div key={gIndex} className="bg-white p-5 rounded-2xl shadow-sm border border-primary/20">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-primary">Passo {gIndex + 1}</h3>
              <button onClick={() => removeGroup(gIndex)} className="text-red-500 text-sm font-medium">Remover Passo</button>
            </div>
            
            <div className="space-y-4">
              <Input 
                label="Título do Passo" 
                placeholder="Ex: Escolha sua Bebida"
                value={group.name}
                onChange={e => updateGroup(gIndex, 'name', e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  type="number"
                  label="Mínimo Escolhas" 
                  value={group.minChoices}
                  onChange={e => updateGroup(gIndex, 'minChoices', parseInt(e.target.value))}
                />
                <Input 
                  type="number"
                  label="Máximo Escolhas" 
                  value={group.maxChoices}
                  onChange={e => updateGroup(gIndex, 'maxChoices', parseInt(e.target.value))}
                />
              </div>

              {/* Itens do Passo */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Opções deste Passo:</label>
                <div className="space-y-2">
                  {group.items.map((item, iIndex) => (
                    <div key={iIndex} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <Input 
                          placeholder="Ex: Coca-Cola 2L"
                          value={item.name}
                          onChange={e => updateItem(gIndex, iIndex, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-24">
                        <Input 
                          placeholder="+ R$ 0,00"
                          type="number"
                          value={item.additionalPriceCents / 100}
                          onChange={e => updateItem(gIndex, iIndex, 'additionalPriceCents', Math.round(parseFloat(e.target.value) * 100))}
                        />
                      </div>
                      <button onClick={() => removeItem(gIndex, iIndex)} className="text-gray-400 hover:text-red-500 p-2">
                        ✕
                      </button>
                    </div>
                  ))}
                  <Button onClick={() => addItem(gIndex)} variant="outline" className="w-full mt-2 border-dashed">
                    + Adicionar Opção
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <Button onClick={addGroup} variant="outline" className="w-full bg-white border-dashed border-2 py-6 text-gray-600 hover:text-primary hover:border-primary">
          + Adicionar Novo Passo ao Combo
        </Button>
      </div>

      {/* Floating Action Button for Mobile / Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:static md:bg-transparent md:border-none md:shadow-none md:p-0 mt-8">
        <Button onClick={handleSave} isLoading={isLoading} className="w-full h-12 text-lg">
          Salvar Combo Completo
        </Button>
      </div>
    </div>
  );
}
