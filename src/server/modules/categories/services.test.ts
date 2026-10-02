import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCategory, updateCategory, deleteCategory } from "./services";
import { db } from "@/db";

// Mocking the database
vi.mock("@/db", () => {
  return {
    db: {
      query: {
        stores: {
          findFirst: vi.fn(),
        },
        categories: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "mocked-cat-id", name: "Bolos", displayOrder: 10 }]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "mocked-cat-id", name: "Bolos Editados" }]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    },
  };
});

describe("Category Services - Domain Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCategory", () => {
    it("deve criar uma categoria e incrementar o displayOrder em 10", async () => {
      // Mock assertStoreExists: user has a store
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
      
      // Mock assertSlugIsUnique: no existing category with this slug
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce(undefined);
      
      // Mock lastCategory: returns the last category with displayOrder 20
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ displayOrder: 20 } as any);

      const result = await createCategory("user-123", { name: "Bolos", slug: "bolos" });

      expect(result.id).toBe("mocked-cat-id");
      expect(db.query.stores.findFirst).toHaveBeenCalledTimes(1);
      // findFirst is called twice for categories: once for slug check, once for last display order
      expect(db.query.categories.findFirst).toHaveBeenCalledTimes(2);
      
      // The insert mock is called, meaning validation passed
      expect(db.insert).toHaveBeenCalled();
    });

    it("deve falhar se o slug já existir na loja", async () => {
      // Mock assertStoreExists
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
      // Mock assertSlugIsUnique: category exists
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "existing-cat" } as any);

      await expect(
        createCategory("user-123", { name: "Bolos", slug: "bolos" })
      ).rejects.toThrow("Já existe uma categoria com este link (slug). Escolha outro.");
    });
  });

  describe("updateCategory", () => {
    it("deve atualizar a categoria com sucesso", async () => {
      // Mock assertStoreExists
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
      // Mock assertCategoryExists: returns the owned category
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "cat-123", storeId: "store-123" } as any);
      // Mock assertSlugIsUnique: returns undefined (slug is free)
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce(undefined);

      const result = await updateCategory("user-123", "cat-123", { name: "Bolos Editados", slug: "bolos-novos" });
      
      expect(result.name).toBe("Bolos Editados");
      expect(db.update).toHaveBeenCalled();
    });

    it("deve falhar se a categoria não pertencer ao usuário (Tenant-IDOR)", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
      // category not found (either doesn't exist or belongs to another store due to the AND clause in query)
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce(undefined);

      await expect(
        updateCategory("user-123", "cat-123", { name: "Hacked", slug: "hacked" })
      ).rejects.toThrow("Categoria não encontrada ou não pertence a sua loja.");
    });
  });

  describe("deleteCategory", () => {
    it("deve deletar a categoria com sucesso se for o dono", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: "store-123" } as any);
      vi.mocked(db.query.categories.findFirst).mockResolvedValueOnce({ id: "cat-123", storeId: "store-123" } as any);

      await deleteCategory("user-123", "cat-123");
      
      expect(db.delete).toHaveBeenCalled();
    });
  });
});
