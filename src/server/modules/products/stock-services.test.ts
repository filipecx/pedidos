import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  restoreStoreDefaultStock,
  quickUpdateProductStock,
  getStoreStockStatusSummary,
  restoreSingleProductStock,
} from "./stock-services";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      query: {
        stores: {
          findFirst: vi.fn(),
        },
        products: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    },
  };
});

describe("Gestão de Estoque ao Abrir a Loja - TDD", () => {
  const mockUserId = "user-123";
  const mockStoreId = "store-456";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStoreStockStatusSummary (Diagnóstico de Estoque)", () => {
    it("deve identificar quando a loja tem produtos de pronta-entrega ativos com estoque zerado", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findMany).mockResolvedValueOnce([
        {
          id: "prod-1",
          name: "Bolo de Cenoura",
          isProntaEntrega: true,
          isActive: true,
          stockQuantity: 0,
          defaultStock: 10,
        },
        {
          id: "prod-2",
          name: "Cookie de Chocolate",
          isProntaEntrega: true,
          isActive: true,
          stockQuantity: 5,
          defaultStock: 12,
        },
      ] as any);

      const summary = await getStoreStockStatusSummary(mockUserId);

      expect(summary.hasZeroStockItems).toBe(true);
      expect(summary.zeroStockCount).toBe(1);
      expect(summary.totalProntaEntregaCount).toBe(2);
      expect(summary.items[0].id).toBe("prod-1");
    });

    it("não deve considerar itens sob encomenda ou inativos como zerados para alerta de abertura", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findMany).mockResolvedValueOnce([
        {
          id: "prod-encomenda",
          name: "Bolo de Casamento",
          isProntaEntrega: false,
          isEncomenda: true,
          isActive: true,
          stockQuantity: null,
          defaultStock: null,
        },
        {
          id: "prod-inativo",
          name: "Pudim Antigo",
          isProntaEntrega: true,
          isActive: false,
          stockQuantity: 0,
          defaultStock: 5,
        },
      ] as any);

      const summary = await getStoreStockStatusSummary(mockUserId);

      expect(summary.hasZeroStockItems).toBe(false);
      expect(summary.zeroStockCount).toBe(0);
      expect(summary.totalProntaEntregaCount).toBe(0);
    });

    it("deve lançar erro se a loja não for encontrada ao buscar resumo de estoque", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce(null);

      await expect(getStoreStockStatusSummary(mockUserId)).rejects.toThrow(
        "Vitrine não encontrada para este usuário."
      );
    });
  });

  describe("restoreStoreDefaultStock (Restaurar Tudo Automaticamente)", () => {
    it("deve restaurar TODOS os produtos de pronta-entrega para seus valores padrão (inclusive os que não estão zerados)", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findMany).mockResolvedValueOnce([
        {
          id: "prod-1",
          name: "Bolo de Cenoura",
          isProntaEntrega: true,
          isActive: true,
          stockQuantity: 0,
          defaultStock: 10,
        },
        {
          id: "prod-2",
          name: "Cookie",
          isProntaEntrega: true,
          isActive: true,
          stockQuantity: 3, // Restavam 3, deve voltar para o padrão 15
          defaultStock: 15,
        },
      ] as any);

      const mockReturning = vi
        .fn()
        .mockResolvedValueOnce([{ id: "prod-1", stockQuantity: 10 }])
        .mockResolvedValueOnce([{ id: "prod-2", stockQuantity: 15 }]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const result = await restoreStoreDefaultStock(mockUserId);

      expect(result.updatedCount).toBe(2);
      expect(result.products).toEqual([
        { id: "prod-1", stockQuantity: 10 },
        { id: "prod-2", stockQuantity: 15 },
      ]);
      expect(db.update).toHaveBeenCalled();
    });

    it("deve lançar erro se a vitrine não for encontrada", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce(null);

      await expect(restoreStoreDefaultStock(mockUserId)).rejects.toThrow(
        "Vitrine não encontrada para este usuário."
      );
    });

    it("deve ignorar produtos cujo padrão configurado for 0 ou nulo na restauração geral", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findMany).mockResolvedValueOnce([
        {
          id: "prod-padrao-zero",
          name: "Item Descontinuado temporário",
          isProntaEntrega: true,
          isActive: true,
          stockQuantity: 0,
          defaultStock: 0,
        },
      ] as any);

      const result = await restoreStoreDefaultStock(mockUserId);

      // Não deve atualizar produtos cujo defaultStock for <= 0
      expect(result.updatedCount).toBe(0);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe("restoreSingleProductStock (Restaurar estoque de 1 produto específico)", () => {
    it("deve restaurar com sucesso o estoque de um único produto para o número padrão cadastrado", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        id: "prod-1",
        storeId: mockStoreId,
        name: "Fatia de Torta",
        isProntaEntrega: true,
        stockQuantity: 1,
        defaultStock: 8,
      } as any);

      const mockReturning = vi.fn().mockResolvedValueOnce([
        { id: "prod-1", stockQuantity: 8 },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const result = await restoreSingleProductStock(mockUserId, "prod-1");

      expect(result.id).toBe("prod-1");
      expect(result.stockQuantity).toBe(8);
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ stockQuantity: 8 }));
    });

    it("deve lançar erro se tentar restaurar estoque de um produto que não existe", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce(null);

      await expect(restoreSingleProductStock(mockUserId, "prod-inexistente")).rejects.toThrow(
        "Produto não encontrado ou não pertence a sua vitrine."
      );
    });

    it("deve lançar erro se tentar restaurar estoque de um produto cujo padrão é 0 ou indefinido", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        id: "prod-1",
        storeId: mockStoreId,
        name: "Fatia de Torta",
        isProntaEntrega: true,
        stockQuantity: 0,
        defaultStock: 0,
      } as any);

      await expect(restoreSingleProductStock(mockUserId, "prod-1")).rejects.toThrow(
        "Este produto não possui um estoque padrão definido maior que zero."
      );
    });

    it("deve lançar erro se o produto pertencer a outra vitrine", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      // Simula que a query com storeId não retornou nada
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce(null);

      await expect(restoreSingleProductStock(mockUserId, "prod-de-outro-lojista")).rejects.toThrow(
        "Produto não encontrado ou não pertence a sua vitrine."
      );
    });
  });

  describe("quickUpdateProductStock (Ajuste Rápido Manual Unitário)", () => {
    it("deve atualizar a quantidade de estoque para um novo número válido", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        id: "prod-1",
        storeId: mockStoreId,
        isProntaEntrega: true,
      } as any);

      const mockReturning = vi.fn().mockResolvedValueOnce([
        { id: "prod-1", stockQuantity: 14 },
      ]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      const result = await quickUpdateProductStock(mockUserId, {
        productId: "prod-1",
        stockQuantity: 14,
      });

      expect(result.stockQuantity).toBe(14);
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({ stockQuantity: 14 }));
    });

    it("deve lançar erro ao tentar definir um estoque negativo", async () => {
      await expect(
        quickUpdateProductStock(mockUserId, {
          productId: "prod-1",
          stockQuantity: -5,
        })
      ).rejects.toThrow("O estoque não pode ser negativo.");
    });

    it("deve lançar erro se o produto for estritamente sob encomenda", async () => {
      vi.mocked(db.query.stores.findFirst).mockResolvedValueOnce({ id: mockStoreId } as any);
      vi.mocked(db.query.products.findFirst).mockResolvedValueOnce({
        id: "prod-encomenda",
        storeId: mockStoreId,
        isProntaEntrega: false,
        isEncomenda: true,
      } as any);

      await expect(
        quickUpdateProductStock(mockUserId, {
          productId: "prod-encomenda",
          stockQuantity: 10,
        })
      ).rejects.toThrow("Produtos sob encomenda não gerenciam estoque de pronta-entrega.");
    });
  });
});
