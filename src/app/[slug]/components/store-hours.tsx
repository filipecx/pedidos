

"use client";

import { useEffect, useState } from "react";

import { isStoreOpenNow } from "@/server/modules/store/store-status";

interface StoreHoursProps {
  businessHours: any; // Using any for now, we'll cast properly
  manualIsOpen?: boolean | null;
}

const DAYS_MAP: Record<string, string> = {
  "0": "Dom",
  "1": "Seg",
  "2": "Ter",
  "3": "Qua",
  "4": "Qui",
  "5": "Sex",
  "6": "Sáb",
};

export function StoreHours({ businessHours, manualIsOpen }: StoreHoursProps) {
  const [isOpen, setIsOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const checkIsOpen = () => {
      setIsOpen(isStoreOpenNow(manualIsOpen, businessHours));
    };

    checkIsOpen();
    const interval = setInterval(checkIsOpen, 60000);
    return () => clearInterval(interval);
  }, [businessHours, manualIsOpen]);

  if (!businessHours) return null;

  const hasDays = businessHours.operatingDays && businessHours.operatingDays.length > 0;

  if (!hasDays) {
    return null;
  }

  const sortedDays = [...businessHours.operatingDays].sort((a, b) => Number(a) - Number(b));

  // Agrupa dias que possuem o mesmo horário de funcionamento
  const scheduleGroups: Record<string, string[]> = {};
  for (const day of sortedDays) {
    const s = businessHours.schedules?.[day];
    const key = (s && s.open && s.close) 
      ? `${s.open} às ${s.close}` 
      : "08:00 às 18:00";

    if (!scheduleGroups[key]) scheduleGroups[key] = [];
    scheduleGroups[key].push(DAYS_MAP[day]);
  }

  const parts = Object.entries(scheduleGroups).map(([time, days]) => {
    return `${days.join(', ')}: ${time}`;
  });

  return (
    <div className="mt-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-3 rounded-xl border border-[var(--color-primary)]/20">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="font-semibold text-sm">Horário de Funcionamento</span>
        </div>

        {isOpen !== null && (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-xs shrink-0 ${
              isOpen
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            {isOpen ? "Aberto agora" : "Fechado agora"}
          </span>
        )}
      </div>

      <div className="pl-6 text-xs text-[var(--color-text)] opacity-90 leading-relaxed">
        {parts.map((p, i) => (
          <span key={i} className="block">{p}</span>
        ))}
      </div>
    </div>
  );
}
