/**
 * Helper de domínio funcional para verificar se uma loja está aberta.
 * Regras:
 * 1. Se manualIsOpen for boolean (true ou false), a escolha manual do lojista prevalece imediatamente.
 * 2. Se manualIsOpen for null ou undefined:
 *    - Se houver businessHours com operatingDays definidos:
 *      - Verifica se o dia atual da semana (Timezone America/Sao_Paulo) está em operatingDays.
 *      - Se houver schedule configurado com open e close, verifica se o minuto atual está dentro do intervalo.
 *      - Se o horário de fechamento for menor que o de abertura (atravessa meia-noite), ajusta a lógica.
 *      - Se o dia estiver em operatingDays mas sem horários estritos, considera aberto.
 *      - Se o dia NÃO estiver em operatingDays, considera fechado.
 *    - Se businessHours não tiver operatingDays ou for vazio, por padrão considera aberto.
 */

export interface StoreBusinessHours {
  operatingDays?: string[];
  deliveryIntervals?: string[];
  schedules?: Record<string, { open: string; close: string }>;
}

export function isStoreOpenNow(
  manualIsOpen?: boolean | null,
  businessHours?: StoreBusinessHours | null,
  currentDate: Date = new Date()
): boolean {
  // 1. Decisão manual tem prioridade total
  if (typeof manualIsOpen === "boolean") {
    return manualIsOpen;
  }

  // 2. Se não houver horários definidos, por padrão está aberto
  if (!businessHours || !businessHours.operatingDays || businessHours.operatingDays.length === 0) {
    return true;
  }

  // 3. Checagem de fuso horário America/Sao_Paulo
  // Cria data no timezone correto de SP
  const spDateStr = currentDate.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const spDate = new Date(spDateStr);

  const currentDay = spDate.getDay().toString(); // '0' = Dom, '1' = Seg, ...
  const currentHour = spDate.getHours();
  const currentMinute = spDate.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Se hoje não for dia de funcionamento configurado
  if (!businessHours.operatingDays.includes(currentDay)) {
    return false;
  }

  const schedule = businessHours.schedules?.[currentDay];
  if (schedule && schedule.open && schedule.close) {
    const [oH, oM] = schedule.open.split(":").map(Number);
    const [cH, cM] = schedule.close.split(":").map(Number);
    const oTotal = oH * 60 + oM;
    const cTotal = cH * 60 + cM;

    // Se fecha no dia seguinte (ex: 18:00 às 02:00)
    if (cTotal < oTotal) {
      return currentTotalMinutes >= oTotal || currentTotalMinutes <= cTotal;
    } else {
      return currentTotalMinutes >= oTotal && currentTotalMinutes <= cTotal;
    }
  }

  // Dia ativo sem restrição horária
  return true;
}
