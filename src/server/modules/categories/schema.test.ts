import { describe, it, expect } from "vitest";
import { createCategorySchema, updateCategorySchema } from "./schema";

describe("Categories - Validação Zod", () => {
  it("deve aprovar categoria válida (name, slug sem espaços)", () => {
    const data = {
      name: "Bolos de Pote",
      slug: "bolos-de-pote",
      description: "Deliciosos bolos no pote",
    };
    
    const result = createCategorySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar slugs contendo espaços", () => {
    const data = {
      name: "Bolos",
      slug: "bolos de pote", 
    };
    
    const result = createCategorySchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.slug).toBeDefined();
    }
  });

  it("deve reprovar slugs com letras maiúsculas ou acentuação", () => {
    const data = {
      name: "Bolos",
      slug: "Bolos-Pote!", 
    };
    
    const result = createCategorySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("deve reprovar update de categoria se faltar o ID", () => {
    const data = {
      name: "Bolos",
      slug: "bolos",
    };
    
    const result = updateCategorySchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.id).toBeDefined();
    }
  });

  it("deve aprovar update de categoria com uuid válido", () => {
    const data = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Bolos Editados",
      slug: "bolos",
    };
    
    const result = updateCategorySchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
