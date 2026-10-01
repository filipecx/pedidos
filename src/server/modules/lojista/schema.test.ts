import { describe, it, expect } from "vitest";
import { registerLojistaSchema } from "./schema";

describe("Registro Lojista - Validação Zod", () => {
  it("deve aprovar dados válidos", () => {
    const data = {
      name: "Maria Doces",
      email: "maria@teste.com",
      password: "senha-super-forte",
      phone: "11999999999",
    };
    
    const result = registerLojistaSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it("deve reprovar senha com menos de 8 caracteres", () => {
    const data = {
      name: "Maria Doces",
      email: "maria@teste.com",
      password: "fraca", // < 8 caracteres
    };
    
    const result = registerLojistaSchema.safeParse(data);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.password?.[0]).toBe("A senha deve ter pelo menos 8 caracteres");
    }
  });

  it("deve reprovar e-mail malformado", () => {
    const data = {
      name: "Maria Doces",
      email: "maria.com", // Formato errado
      password: "senha-super-forte",
    };
    
    const result = registerLojistaSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
