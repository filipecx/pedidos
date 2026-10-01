import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore } from "./services";
import { db } from "@/db";

// "Mockamos" o nosso banco de dados inteiro. Dessa forma o teste roda 
// ultra rápido em memória, sem precisar tocar no PostgreSQL real.
vi.mock("@/db", () => {
  return {
    db: {
      query: {
        stores: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "mocked-store-id", name: "Minha Loja", slug: "minha-loja" }])
        })
      })
    },
  };
});

describe("Store Services - Regras de Negócio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar uma vitrine caso o usuário não tenha nenhuma e o slug esteja livre", async () => {
    // Simulamos que o findFirst retorna vazio (undefined) em todas as verificações
    vi.mocked(db.query.stores.findFirst).mockResolvedValue(undefined);

    const result = await createStore("user-id-123", "Minha Loja", "minha-loja");
    
    expect(result.id).toBe("mocked-store-id");
    // Garante que o banco foi consultado duas vezes (uma para usuário, outra para slug)
    expect(db.query.stores.findFirst).toHaveBeenCalledTimes(2);
  });

  it("NÃO DEVE permitir criar vitrine se o lojista já possui uma", async () => {
    // Simulamos que a primeira chamada ao banco (checkIfUserHasStore) retorna que ele já tem uma loja
    vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "loja-antiga" } as any);

    await expect(
      createStore("user-id-123", "Nova Loja", "nova-loja")
    ).rejects.toThrow("Você já possui uma vitrine cadastrada.");
  });

  it("NÃO DEVE permitir criar vitrine se o slug já está em uso por outro lojista", async () => {
    // O primeiro findFirst (checa usuário) retorna undefined
    // O segundo findFirst (checa slug) retorna que a loja existe
    vi.mocked(db.query.stores.findFirst)
      .mockResolvedValueOnce(undefined) // Usuário livre
      .mockResolvedValueOnce({ id: "loja-do-concorrente" } as any); // Slug ocupado

    await expect(
      createStore("user-id-123", "Doces", "slug-ocupado")
    ).rejects.toThrow("Esse link já está em uso por outra confeitaria. Escolha outro.");
  });
});
