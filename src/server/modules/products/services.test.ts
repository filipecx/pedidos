import { describe, it, expect, vi, beforeEach } from "vitest";
import { createProduct } from "./services";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      query: {
        stores: {
          findFirst: vi.fn(),
        },
        categories: {
          findFirst: vi.fn(),
        },
        products: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "mocked-prod-id", name: "Bolo de Pote" }]),
        }),
      }),
    },
  };
});

describe("Products Services - Domain Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve criar um produto com sucesso se for dono da loja e da categoria", async () => {
    // mock store exists
    vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
    // mock category belongs to store
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "cat-123" } as any);

    const result = await createProduct("user-123", {
      categoryId: "cat-123",
      name: "Bolo",
      basePriceCents: 1000,
      isProntaEntrega: true,
      isEncomenda: false,
      stockQuantity: 5,
    });

    expect(result.id).toBe("mocked-prod-id");
    expect(db.insert).toHaveBeenCalled();
  });

  it("deve atribuir o ponto médio entre dois produtos já existentes ao inserir no meio", async () => {
    vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "cat-123" } as any);

    const insertMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "prod-mid", name: "Bolo Trufado", displayOrder: 25 }]),
    });
    vi.mocked(db.insert).mockReturnValueOnce({ values: insertMock } as any);

    // Inserindo entre produto com ordem 20 e produto com ordem 30
    await createProduct("user-123", {
      categoryId: "cat-123",
      name: "Bolo Trufado",
      basePriceCents: 1500,
      isProntaEntrega: true,
      isEncomenda: false,
      stockQuantity: 2,
      prevOrder: 20,
      nextOrder: 30,
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOrder: 25,
      })
    );
  });

  it("deve crescer o displayOrder de 10 em 10 quando não especificado vizinhos", async () => {
    vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "cat-123" } as any);
    // Último produto com displayOrder 30
    vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({ displayOrder: 30 } as any);

    const insertMock = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "prod-next", name: "Bolo Novo", displayOrder: 40 }]),
    });
    vi.mocked(db.insert).mockReturnValueOnce({ values: insertMock } as any);

    await createProduct("user-123", {
      categoryId: "cat-123",
      name: "Bolo Novo",
      basePriceCents: 2000,
      isProntaEntrega: true,
      isEncomenda: false,
      stockQuantity: 10,
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        displayOrder: 40,
      })
    );
  });

  it("NÃO deve permitir criar produto com categoria de outro lojista (Tenant-IDOR)", async () => {
    // mock store exists
    vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
    // mock category does NOT belong to store (returns undefined)
    vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce(undefined);

    await expect(
      createProduct("user-123", {
        categoryId: "hacked-cat-id",
        name: "Bolo Hacker",
        basePriceCents: 1000,
        isProntaEntrega: true,
        isEncomenda: false,
      })
    ).rejects.toThrow("Categoria não encontrada ou não pertence a sua vitrine.");
    
    expect(db.insert).not.toHaveBeenCalled();
  });
});
