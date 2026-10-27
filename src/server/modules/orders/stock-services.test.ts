import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelOrderAndRestoreStock } from './stock-services';
import { db } from '@/db';

describe('Domain Service: cancelOrderAndRestoreStock', () => {
  const mockOrderId = 'order-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Idempotência: Se o pedido já estava CANCELED, não deve tentar restaurar estoque nem lançar erro', async () => {
    // Simula update retornando vazio (pois where status != CANCELED falhou)
    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]), // Não afetou nenhuma linha
          }),
        }),
      }),
      query: {
        orderItems: {
          findMany: vi.fn(),
        },
      },
    };

    const result = await cancelOrderAndRestoreStock(mockOrderId, mockTx as any);

    expect(result.success).toBe(true);
    expect(result.alreadyCanceled).toBe(true);
    // Não deve consultar os itens nem alterar tabela de produtos
    expect(mockTx.query.orderItems.findMany).not.toHaveBeenCalled();
  });

  it('2. Fluxo Normal: Deve atualizar status para CANCELED e incrementar estoque dos produtos', async () => {
    const mockUpdateProductSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    const mockTx = {
      update: vi.fn((table: any) => ({
        set: vi.fn().mockImplementation((val) => {
          if (val.status === 'CANCELED') {
            return {
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ id: mockOrderId, cartType: 'pronta_entrega' }]),
              }),
            };
          }
          return mockUpdateProductSet(val);
        }),
      })),
      query: {
        orderItems: {
          findMany: vi.fn().mockResolvedValue([
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ]),
        },
      },
    };

    const result = await cancelOrderAndRestoreStock(mockOrderId, mockTx as any);

    expect(result.success).toBe(true);
    expect(result.alreadyCanceled).toBe(false);
    expect(mockTx.query.orderItems.findMany).toHaveBeenCalledWith(
      expect.anything()
    );
    // Verificou 2 produtos restaurados
    expect(mockTx.update).toHaveBeenCalledTimes(3); // 1 do pedido + 2 dos itens
  });
});
