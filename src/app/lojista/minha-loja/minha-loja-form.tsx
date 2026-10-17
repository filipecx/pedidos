"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLojistaProfile, validatePixKeyAction } from "@/server/actions/update-lojista-profile";
import type { PixKeyCheckResult } from "@/server/modules/payments/openpix";

interface MinhaLojaFormProps {
  initialData: {
    storeName: string;
    slug: string;
    pixKey: string;
    userName: string;
    businessHours?: {
      operatingDays: string[];
      deliveryIntervals: string[];
      schedules?: Record<string, { open: string; close: string }>;
    };
    manualIsOpen?: boolean | null;
  };
}

const DAYS_OF_WEEK = [
  { id: "1", label: "Seg" },
  { id: "2", label: "Ter" },
  { id: "3", label: "Qua" },
  { id: "4", label: "Qui" },
  { id: "5", label: "Sex" },
  { id: "6", label: "Sáb" },
  { id: "0", label: "Dom" },
];

const INTERVALS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "12:00 - 14:00",
  "14:00 - 16:00",
  "16:00 - 18:00",
  "18:00 - 20:00",
  "20:00 - 22:00",
];

export function MinhaLojaForm({ initialData }: MinhaLojaFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Status de Abertura / Fechamento da Loja: "auto" | "open" | "closed"
  const [storeStatus, setStoreStatus] = useState<"auto" | "open" | "closed">(() => {
    if (initialData.manualIsOpen === true) return "open";
    if (initialData.manualIsOpen === false) return "closed";
    return "auto";
  });

  // Estados de Validação Pix no Banco Central
  const [pixKeyInput, setPixKeyInput] = useState(initialData.pixKey || "");
  const [isValidatingPix, setIsValidatingPix] = useState(false);
  const [pixValidation, setPixValidation] = useState<PixKeyCheckResult | null>(null);
  const [pixValidationError, setPixValidationError] = useState<string | null>(null);

  const handleValidatePixKey = async () => {
    if (!pixKeyInput.trim()) return;
    setIsValidatingPix(true);
    setPixValidationError(null);
    setPixValidation(null);

    try {
      const res = await validatePixKeyAction(pixKeyInput);
      if (res.valid) {
        setPixValidation(res);
      } else {
        setPixValidationError(res.error || "Chave Pix não encontrada.");
      }
    } catch (e) {
      setPixValidationError("Erro ao verificar chave no momento.");
    } finally {
      setIsValidatingPix(false);
    }
  };

  const [operatingDays, setOperatingDays] = useState<string[]>(
    initialData.businessHours?.operatingDays || ["1", "2", "3", "4", "5"]
  );
  const [deliveryIntervals, setDeliveryIntervals] = useState<string[]>(
    initialData.businessHours?.deliveryIntervals || ["10:00 - 12:00", "14:00 - 16:00"]
  );
  
  const [schedules, setSchedules] = useState<Record<string, { open: string, close: string }>>(
    initialData.businessHours?.schedules || {}
  );

  function toggleDay(id: string) {
    setOperatingDays((prev) => {
      const isCurrentlyActive = prev.includes(id);
      if (isCurrentlyActive) {
        return prev.filter((d) => d !== id);
      } else {
        // Automatically initialize schedule if empty when activating
        setSchedules(s => ({
          ...s,
          [id]: s[id] || { open: "08:00", close: "18:00" }
        }));
        return [...prev, id];
      }
    });
  }

  function updateSchedule(id: string, field: 'open' | 'close', value: string) {
    setSchedules((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  }

  function toggleInterval(interval: string) {
    setDeliveryIntervals((prev) =>
      prev.includes(interval) ? prev.filter((i) => i !== interval) : [...prev, interval]
    );
  }

  async function onSubmit(formData: FormData) {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Filter schedules to only include active days to keep JSON clean
    const activeSchedules: Record<string, { open: string, close: string }> = {};
    for (const day of operatingDays) {
      activeSchedules[day] = schedules[day] || { open: "08:00", close: "18:00" };
    }

    formData.append(
      "businessHours",
      JSON.stringify({ operatingDays, deliveryIntervals, schedules: activeSchedules })
    );

    formData.append("manualIsOpen", storeStatus);

    const result = await updateLojistaProfile(formData);

    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccessMsg("Informações atualizadas com sucesso!");
    }
    
    setIsLoading(false);
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl">
          {successMsg}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Informações da Loja</h2>
        
        <Input
          label="Nome da Loja"
          name="storeName"
          defaultValue={initialData.storeName}
          required
          placeholder="Minha Confeitaria"
        />

        <Input
          label="Link da Vitrine (Slug)"
          name="slug"
          defaultValue={initialData.slug}
          required
          placeholder="minha-confeitaria"
        />
        <p className="text-xs text-gray-500 -mt-2 mb-4">
          O link da sua loja será: <strong>seudominio.com/slug</strong>
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Chave Pix</label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              name="pixKey"
              value={pixKeyInput}
              onChange={(e) => {
                setPixKeyInput(e.target.value);
                setPixValidation(null);
                setPixValidationError(null);
              }}
              placeholder="CPF, E-mail, Celular ou Chave Aleatória"
              className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
            <button
              type="button"
              onClick={handleValidatePixKey}
              disabled={isValidatingPix || !pixKeyInput.trim()}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl border border-gray-300 transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {isValidatingPix ? "Consultando..." : "Verificar Titular"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            Deixe em branco se não quiser receber pagamentos Pix automáticos.
          </p>

          {/* Resultado da Validação no Banco Central */}
          {pixValidation && (
            <div className="mt-3 p-3.5 bg-green-50 border border-green-200 rounded-xl text-sm animate-in fade-in">
              <div className="flex items-center gap-2 text-green-800 font-bold mb-1">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Chave validada no Banco Central!
              </div>
              <div className="text-xs text-green-900 space-y-0.5 mt-2 bg-white/70 p-2.5 rounded-lg border border-green-100">
                {pixValidation.owner?.name && (
                  <p><span className="text-gray-500 font-medium">Titular:</span> <strong className="font-semibold text-gray-900">{pixValidation.owner.name}</strong></p>
                )}
                {pixValidation.owner?.psp && (
                  <p><span className="text-gray-500 font-medium">Banco:</span> {pixValidation.owner.psp}</p>
                )}
                {pixValidation.owner?.taxID && (
                  <p><span className="text-gray-500 font-medium">Documento:</span> {pixValidation.owner.taxID}</p>
                )}
                {pixValidation.type && (
                  <p><span className="text-gray-500 font-medium">Tipo:</span> {pixValidation.type}</p>
                )}
              </div>
            </div>
          )}

          {pixValidationError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{pixValidationError}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Status & Horários de Funcionamento</h2>
          <p className="text-xs text-gray-500 mt-1">
            Escolha se a vitrine segue os horários automaticamente ou se você deseja abrir/fechar agora mesmo.
          </p>
        </div>

        {/* CONTROLE DE ABERTURA / FECHAMENTO */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <label className="block text-sm font-bold text-gray-800">
            Funcionamento da Vitrine
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStoreStatus("auto")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                storeStatus === "auto"
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Automático</span>
              </div>
              <span className={`text-[10px] font-normal ${storeStatus === "auto" ? "text-white/80" : "text-gray-400"}`}>
                Abre/fecha pelos horários
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoreStatus("open")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                storeStatus === "open"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Forçar Aberto</span>
              </div>
              <span className={`text-[10px] font-normal ${storeStatus === "open" ? "text-white/80" : "text-gray-400"}`}>
                Recebendo pedidos agora
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStoreStatus("closed")}
              className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                storeStatus === "closed"
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Forçar Fechado</span>
              </div>
              <span className={`text-[10px] font-normal ${storeStatus === "closed" ? "text-white/80" : "text-gray-400"}`}>
                Pausa novos checkouts
              </span>
            </button>
          </div>
          <p className="text-[11px] text-gray-500">
            {storeStatus === "auto" && "A loja abrirá e fechará automaticamente de acordo com a programação de dias e horas abaixo."}
            {storeStatus === "open" && "Sua loja ficará aberta agora, mesmo se estiver fora do horário programado."}
            {storeStatus === "closed" && "Sua loja ficará fechada agora, impedindo novos pedidos de pronta-entrega e checkout."}
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Dias e Horários de Programação</label>
          <div className="flex flex-col gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const isActive = operatingDays.includes(day.id);
              const schedule = schedules[day.id] || { open: "08:00", close: "18:00" };
              
              return (
                <div key={day.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`w-full sm:w-24 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all text-center sm:text-left ${
                      isActive 
                        ? "bg-primary text-white border-primary shadow-sm" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {day.label}
                  </button>
                  
                  {isActive && (
                    <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in duration-200">
                      <input 
                        type="time"
                        lang="pt-BR"
                        value={schedule.open}
                        onChange={(e) => updateSchedule(day.id, 'open', e.target.value)}
                        className="flex-1 sm:w-32 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white text-gray-900 font-medium"
                      />
                      <span className="text-gray-400 font-medium text-sm">às</span>
                      <input 
                        type="time"
                        lang="pt-BR"
                        value={schedule.close}
                        onChange={(e) => updateSchedule(day.id, 'close', e.target.value)}
                        className="flex-1 sm:w-32 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white text-gray-900 font-medium"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Esses horários aparecerão no topo da vitrine e impedirão compras de pronta-entrega fora do expediente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Janelas de Entrega / Retirada (Encomendas)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {INTERVALS.map((interval) => {
              const isActive = deliveryIntervals.includes(interval);
              return (
                <button
                  key={interval}
                  type="button"
                  onClick={() => toggleInterval(interval)}
                  className={`px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                    isActive 
                      ? "bg-primary/10 text-primary border-primary/30" 
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {interval}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Selecione os intervalos que você disponibiliza para clientes agendarem a entrega ou retirada de encomendas.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Minha Conta</h2>
        
        <Input
          label="Seu Nome (Lojista)"
          name="userName"
          defaultValue={initialData.userName}
          required
          placeholder="Maria Silva"
        />
      </div>

      <div className="pt-2 pb-10">
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isLoading}
          className="w-full md:w-auto"
        >
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
