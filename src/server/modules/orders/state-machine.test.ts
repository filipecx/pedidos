import { describe, it, expect } from "vitest";
import {
  isValidOrderStatusTransition,
  getNextOrderStatusAction,
  VALID_ORDER_TRANSITIONS,
} from "./state-machine";

describe("Order State Machine", () => {
  it("deve permitir fluxo progressivo normal: PENDING_PAYMENT -> PREPARING -> READY -> DISPATCHED -> DELIVERED", () => {
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "PREPARING")).toBe(true);
    expect(isValidOrderStatusTransition("PREPARING", "READY")).toBe(true);
    expect(isValidOrderStatusTransition("READY", "DISPATCHED")).toBe(true);
    expect(isValidOrderStatusTransition("READY", "DELIVERED")).toBe(true);
    expect(isValidOrderStatusTransition("DISPATCHED", "DELIVERED")).toBe(true);
  });

  it("deve permitir cancelamento a partir de estados não terminais", () => {
    expect(isValidOrderStatusTransition("PENDING_PAYMENT", "CANCELED")).toBe(true);
    expect(isValidOrderStatusTransition("PREPARING", "CANCELED")).toBe(true);
    expect(isValidOrderStatusTransition("READY", "CANCELED")).toBe(true);
    expect(isValidOrderStatusTransition("DISPATCHED", "CANCELED")).toBe(true);
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
    expect(nextFromPending?.shortLabel).toBe("✓");
    expect(nextFromPending?.isCheckOnly).toBe(true);

    const nextFromPreparing = getNextOrderStatusAction("PREPARING", "DELIVERY", "PREPARING");
    expect(nextFromPreparing?.nextStatus).toBe("READY");
    expect(nextFromPreparing?.shortLabel).toBe("✓");
    expect(nextFromPreparing?.isCheckOnly).toBe(true);

    const nextFromProntoRow = getNextOrderStatusAction("READY", "PICKUP", "READY");
    expect(nextFromProntoRow?.nextStatus).toBe("DELIVERED");
    expect(nextFromProntoRow?.shortLabel).toBe("✓");
    expect(nextFromProntoRow?.isCheckOnly).toBe(true);

    const nextFromReadyDelivery = getNextOrderStatusAction("READY", "DELIVERY", "READY");
    expect(nextFromReadyDelivery?.nextStatus).toBe("DISPATCHED");
    expect(nextFromReadyDelivery?.shortLabel).toBe("Despachar");
    expect(nextFromReadyDelivery?.isCheckOnly).toBe(false);

    const nextFromDispatchedRow = getNextOrderStatusAction("DISPATCHED", "DELIVERY", "DISPATCHED");
    expect(nextFromDispatchedRow?.nextStatus).toBe("DELIVERED");
    expect(nextFromDispatchedRow?.shortLabel).toBe("Concluir");
    expect(nextFromDispatchedRow?.isCheckOnly).toBe(false);

    expect(getNextOrderStatusAction("DELIVERED")).toBeNull();
    expect(getNextOrderStatusAction("CANCELED")).toBeNull();
  });
});
