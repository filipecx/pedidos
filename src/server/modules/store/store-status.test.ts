import { describe, it, expect } from "vitest";
import { isStoreOpenNow } from "./store-status";

describe("Store Status Domain Rules (isStoreOpenNow)", () => {
  it("deve respeitar controle manual: se manualIsOpen for false, está fechado mesmo dentro do horário", () => {
    const businessHours = {
      operatingDays: ["1", "2", "3", "4", "5"],
      schedules: {
        "1": { open: "08:00", close: "18:00" },
      },
    };
    // Segunda-feira 10h da manhã em SP (UTC 13h)
    const monday10am = new Date("2026-10-19T13:00:00Z");
    
    // Forçado fechado
    expect(isStoreOpenNow(false, businessHours, monday10am)).toBe(false);
  });

  it("deve respeitar controle manual: se manualIsOpen for true, está aberto mesmo fora do horário ou em dia fechado", () => {
    const businessHours = {
      operatingDays: ["1", "2", "3", "4", "5"], // Segunda a Sexta
      schedules: {
        "0": { open: "08:00", close: "18:00" },
      },
    };
    // Domingo 10h da manhã em SP (UTC 13h)
    const sunday10am = new Date("2026-10-18T13:00:00Z");
    
    // Forçado aberto
    expect(isStoreOpenNow(true, businessHours, sunday10am)).toBe(true);
  });

  it("deve seguir horário automático se manualIsOpen for null ou undefined", () => {
    const businessHours = {
      operatingDays: ["1"], // apenas segunda
      schedules: {
        "1": { open: "09:00", close: "18:00" },
      },
    };

    // Segunda-feira 10:00 SP (UTC 13:00) -> Aberto
    const mondayOpen = new Date("2026-10-19T13:00:00Z");
    expect(isStoreOpenNow(null, businessHours, mondayOpen)).toBe(true);
    expect(isStoreOpenNow(undefined, businessHours, mondayOpen)).toBe(true);

    // Segunda-feira 20:00 SP (UTC 23:00) -> Fechado
    const mondayClosed = new Date("2026-10-19T23:00:00Z");
    expect(isStoreOpenNow(null, businessHours, mondayClosed)).toBe(false);

    // Terça-feira (dia não cadastrado) -> Fechado
    const tuesday = new Date("2026-10-20T13:00:00Z");
    expect(isStoreOpenNow(null, businessHours, tuesday)).toBe(false);
  });

  it("deve considerar aberto se não tiver horário de funcionamento configurado e manualIsOpen for null", () => {
    expect(isStoreOpenNow(null, null)).toBe(true);
    expect(isStoreOpenNow(null, { operatingDays: [] })).toBe(true);
  });

  it("deve lidar com horários que passam da meia-noite (noturnos)", () => {
    const businessHours = {
      operatingDays: ["5"], // Sexta
      schedules: {
        "5": { open: "18:00", close: "02:00" }, // 18h até 2h da madrugada seguinte
      },
    };

    // Sexta-feira 23:00 SP (UTC 02:00 sábado)
    const fridayNight = new Date("2026-10-24T02:00:00Z");
    expect(isStoreOpenNow(null, businessHours, fridayNight)).toBe(true);

    // Sexta-feira 15:00 SP (UTC 18:00 sexta) -> Fechado ainda
    const fridayAfternoon = new Date("2026-10-23T18:00:00Z");
    expect(isStoreOpenNow(null, businessHours, fridayAfternoon)).toBe(false);
  });
});
