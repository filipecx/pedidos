import { describe, it, expect } from "vitest";
import {
  isValidOrderStatusTransition,
  getNextOrderStatusAction,
  VALID_ORDER_TRANSITIONS,
} from "./state-machine";

describe("Order State Machine", () => {
  it("deve permitir fluxo progressivo normal: PENDING_PAYMENT -> PREPARING -> READY -> DELIVERED", () => {
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "PREPARING")).toBe(true);
    expect(isValidOrderStatusTransition("PREPARING", "READY")).toBe(true);
    expect(isValidOrderStatusTransition("READY", "DELIVERED")).toBe(true);
  });

  it("deve permitir cancelamento a partir de estados não terminais", () => {
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "CANCELED")).toBe(true);
    expect(isValidOrderStatusTransition("PREPARING", "CANCELED")).toBe(true);
    expect(isValidOrderStatusTransition("READY", "CANCELED")).toBe(true);
  });

  it("NÃO deve permitir transições a partir de estados terminais (DELIVERED e CANCELED)", () => {
    expect(VALID_ORDER_TRANSITIONS.DELIVERED).toHaveLength(0);
    expect(VALID_ORDER_TRANSITIONS.CANCELED).toHaveLength(0);

    expect(isValidOrderStatusTransition("DELIVERED", "PREPARING")).toBe(false);
    expect(isValidOrderStatusTransition("DELIVERED", "READY")).toBe(false);
    expect(isValidOrderStatusTransition("DELIVERED", "CANCELED")).toBe(false);
    expect(isValidOrderStatusTransition("CANCELED", "PREPARING")).toBe(false);
    expect(isValidOrderStatusTransition("CANCELED", "DELIVERED")).toBe(false);
  });

  it("NÃO deve permitir pular etapas inválidas diretamente", () => {
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "DELIVERED")).toBe(false);
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "READY")).toBe(false);
  });

  it("NÃO deve permitir transição para o mesmo status", () => {
    expect(isValidOrderStatusTransition("PREPARING", "PREPARING")).toBe(false);
  });

  it("getNextOrderStatusAction deve fornecer o próximo passo operacional correto", () => {
    const nextFromPending = getNextOrderStatusAction("PENDING_PAYMENT");
    expect(nextFromPending?.nextStatus).toBe("PREPARING");

    const nextFromPreparingDelivery = getNextOrderStatusAction("PREPARING", "DELIVERY");
    expect(nextFromPreparingDelivery?.nextStatus).toBe("READY");
    expect(nextFromPreparingDelivery?.shortLabel).toBe("Despachado");

    const nextFromPreparingPickup = getNextOrderStatusAction("PREPARING", "PICKUP");
    expect(nextFromPreparingPickup?.nextStatus).toBe("READY");
    expect(nextFromPreparingPickup?.shortLabel).toBe("Preparado");

    const nextFromReadyDelivery = getNextOrderStatusAction("READY", "DELIVERY");
    expect(nextFromReadyDelivery?.nextStatus).toBe("DELIVERED");
    expect(nextFromReadyDelivery?.shortLabel).toBe("Finalizado");

    const nextFromReadyPickup = getNextOrderStatusAction("READY", "PICKUP");
    expect(nextFromReadyPickup?.nextStatus).toBe("DELIVERED");
    expect(nextFromReadyPickup?.shortLabel).toBe("Finalizado");

    expect(getNextOrderStatusAction("DELIVERED")).toBeNull();
    expect(getNextOrderStatusAction("CANCELED")).toBeNull();
  });
});
