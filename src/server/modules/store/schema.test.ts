import { describe, it, expect } from "vitest";
import { createStoreSchema } from "./schema";

describe("Criação de Vitrine - Validação Zod", () => {
  it("deve aprovar slug e nomes válidos", () => {
    const data = {
      name: "Doces da Maria",
      slug: "doces-da-maria",
    };
    
    const result = createStoreSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar slugs contendo espaços", () => {
    const data = {
      name: "Doces da Maria",
      slug: "doces da maria", // Espaço não é permitido
    };
    
    const result = createStoreSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("deve reprovar slugs contendo letras maiúsculas ou acentos", () => {
    const data = {
      name: "Doces da Maria",
      slug: "Doces-Da-Maria!", // Maiúsculas e exclamação
    };
    
    const result = createStoreSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
