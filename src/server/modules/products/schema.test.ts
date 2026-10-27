import { describe, it, expect } from "vitest";
import { createProductSchema } from "./schema";

describe("Products - Validação Zod", () => {
  it("deve aprovar produto PRONTA_ENTREGA com estoque", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo de Pote",
      basePriceCents: 1500,
      isProntaEntrega: true,
      stockQuantity: 10,
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar produto PRONTA_ENTREGA sem estoque", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo de Pote",
      basePriceCents: 1500,
      isProntaEntrega: true,
      // Faltando stockQuantity
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Estoque é obrigatório para produtos de pronta-entrega");
    }
  });

  it("deve aprovar produto ENCOMENDA com tempo de preparo", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo de Casamento",
      basePriceCents: 50000,
      isEncomenda: true,
      preparationTimeDays: 7,
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar produto ENCOMENDA sem tempo de preparo", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo de Casamento",
      basePriceCents: 50000,
      isEncomenda: true,
      // Faltando preparationTimeDays
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Tempo de preparo é obrigatório para encomendas");
    }
  });

  it("deve aprovar imageUrl válido", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo com Imagem",
      basePriceCents: 1500,
      isProntaEntrega: true,
      stockQuantity: 10,
      imageUrl: "https://pub-r2.dev/imagem-produto.webp"
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar imageUrl inválido", () => {
    const data = {
      categoryId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolo com Imagem Quebrada",
      basePriceCents: 1500,
      isProntaEntrega: true,
      stockQuantity: 10,
      imageUrl: "nao-e-uma-url"
    };
    
    const result = createProductSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("URL de imagem inválida");
    }
  });
});
