import { describe, it, expect } from "vitest";
import { createStoreSchema, updateCustomizationSchema } from "./schema";

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

describe("Personalização da Vitrine - Validação Zod", () => {
  it("deve aprovar bannerUrl e profileUrl válidos", () => {
    const data = {
      bannerUrl: "https://pub-r2.dev/banner.jpg",
      profileUrl: "https://pub-r2.dev/perfil.png",
    };
    
    const result = updateCustomizationSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar bannerUrl inválido", () => {
    const data = {
      bannerUrl: "nao-e-url",
    };
    
    const result = updateCustomizationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("URL de banner inválida");
    }
  });

  it("deve reprovar profileUrl inválido", () => {
    const data = {
      profileUrl: "www.semhttp.com",
    };
    
    const result = updateCustomizationSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("URL de perfil inválida");
    }
  });
});
