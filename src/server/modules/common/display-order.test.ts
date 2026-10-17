import { describe, it, expect } from "vitest";
import { 
  getNextDisplayOrder, 
  calculateMidpointOrder, 
  rebalanceDisplayOrders,
  DEFAULT_ORDER_STEP 
} from "./display-order";

describe("Display Order Domain - Fractional / Step 10 & Midpoint Insertion", () => {
  describe("1. Crescimento de 10 em 10 (Step 10)", () => {
    it("deve iniciar em 10 quando não há itens prévios (lista vazia)", () => {
      expect(getNextDisplayOrder(null)).toBe(10);
      expect(getNextDisplayOrder(undefined)).toBe(10);
    });

    it("deve crescer de 10 em 10 a cada item consecutivo inserido", () => {
      const first = getNextDisplayOrder();
      expect(first).toBe(10);

      const second = getNextDisplayOrder(first);
      expect(second).toBe(20);

      const third = getNextDisplayOrder(second);
      expect(third).toBe(30);

      const fourth = getNextDisplayOrder(third);
      expect(fourth).toBe(40);
    });
  });

  describe("2. Inserção no Meio (Midpoint / Entre dois itens)", () => {
    it("deve atribuir exatamente o número intermediário entre dois existentes sem realocar os outros", () => {
      // Inserindo entre o item #1 (10) e o item #2 (20)
      const result = calculateMidpointOrder(10, 20);
      expect(result.displayOrder).toBe(15);
      expect(result.needsRebalance).toBe(false);
    });

    it("deve calcular o ponto médio com precisão em sub-intervalos sucessivos", () => {
      // Inserindo entre 10 e 15 -> deve dar 12
      const step1 = calculateMidpointOrder(10, 15);
      expect(step1.displayOrder).toBe(12);
      expect(step1.needsRebalance).toBe(false);

      // Inserindo entre 12 e 15 -> deve dar 13
      const step2 = calculateMidpointOrder(12, 15);
      expect(step2.displayOrder).toBe(13);
      expect(step2.needsRebalance).toBe(false);
    });

    it("deve calcular a metade ao inserir antes do primeiro item", () => {
      // Inserindo antes de 10 -> metade de 10 é 5
      const result = calculateMidpointOrder(null, 10);
      expect(result.displayOrder).toBe(5);
      expect(result.needsRebalance).toBe(false);
    });

    it("deve somar 10 ao inserir após o último item", () => {
      const result = calculateMidpointOrder(30, null);
      expect(result.displayOrder).toBe(40);
      expect(result.needsRebalance).toBe(false);
    });

    it("deve sinalizar needsRebalance quando não houver número inteiro disponível entre dois vizinhos (ex: 10 e 11)", () => {
      const result = calculateMidpointOrder(10, 11);
      expect(result.needsRebalance).toBe(true);
    });
  });

  describe("3. Rebalanceamento / Restauração de 10 em 10", () => {
    it("deve redistribuir uma lista de itens compactados de volta para o padrão de 10 em 10", () => {
      const fragmentedItems = [
        { id: "item-1", name: "Bolo de Chocolate" },
        { id: "item-2", name: "Bolo de Cenoura" },
        { id: "item-3", name: "Torta de Limão" },
        { id: "item-4", name: "Cheesecake" },
      ];

      const rebalanced = rebalanceDisplayOrders(fragmentedItems);

      expect(rebalanced).toEqual([
        { id: "item-1", displayOrder: 10 },
        { id: "item-2", displayOrder: 20 },
        { id: "item-3", displayOrder: 30 },
        { id: "item-4", displayOrder: 40 },
      ]);
    });
  });
});
