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
      type: "PRONTA_ENTREGA",
      stockQuantity: 5,
    });

    expect(result.id).toBe("mocked-prod-id");
    expect(db.insert).toHaveBeenCalled();
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
        type: "PRONTA_ENTREGA",
      })
    ).rejects.toThrow("Categoria não encontrada ou não pertence a sua vitrine.");
    
    expect(db.insert).not.toHaveBeenCalled();
  });
});
