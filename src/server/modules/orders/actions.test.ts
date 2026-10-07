import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderAction } from './actions';
import { db } from '@/db';
import { createOpenPixCharge } from '../payments/openpix';

// 1. Mocks de dependências externas
vi.mock('@/db', () => {
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'mocked-uuid' }]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  };

  return {
    db: {
      query: {
        products: {
          findMany: vi.fn(),
        },
      },
      transaction: vi.fn(async (cb) => cb({
        insert: vi.fn().mockReturnValue(chainable),
        update: vi.fn().mockReturnValue(chainable),
      })),
      update: vi.fn().mockReturnValue(chainable),
    },
  };
});

vi.mock('../payments/openpix', () => ({
  createOpenPixCharge: vi.fn(),
}));

describe('Checkout Server Action (Segurança e Recálculo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NÃO deve confiar no valor do front-end e DEVE recalcular pelo banco de dados', async () => {
    // 1. Preparação (Mock)
    const mockProductId = '123e4567-e89b-12d3-a456-426614174000';
    const mockStoreId = '123e4567-e89b-12d3-a456-426614174001';
    
    // Fingimos que o banco de dados tem o produto custando R$ 50,00 (5000 centavos)
    (db.query.products.findMany as any).mockResolvedValue([
      { id: mockProductId, name: 'Bolo de Cenoura', basePriceCents: 5000 }
    ]);

    (createOpenPixCharge as any).mockResolvedValue({
      charge: {
        correlationID: 'mocked-correlation',
        brCode: 'pix-copia-cola-123',
        qrCodeImage: 'http://qr.com',
      }
    });

    const payload = {
      storeId: mockStoreId,
      customerName: 'Hacker',
      customerPhone: '11999999999',
      deliveryMethod: 'DELIVERY' as const, 
      cartType: 'pronta_entrega' as const,
      items: [
        { productId: mockProductId, quantity: 2 } 
      ]
    };

    // 2. Execução
    const result = await createOrderAction(payload);

    // 3. Verificação
    expect(result.success).toBe(true);
    
    expect(createOpenPixCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 11000,
        customer: {
          name: 'Hacker',
          phone: '11999999999'
        }
      })
    );
  });

  it('deve retornar erro se o produto do carrinho não existir mais no banco', async () => {
    (db.query.products.findMany as any).mockResolvedValue([]);

    const payload = {
      storeId: '123e4567-e89b-12d3-a456-426614174001',
      customerName: 'Cliente',
      customerPhone: '11999999999',
      deliveryMethod: 'PICKUP' as const,
      cartType: 'pronta_entrega' as const,
      items: [
        { productId: '123e4567-e89b-12d3-a456-426614174002', quantity: 1 }
      ]
    };

    const result = await createOrderAction(payload);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Alguns produtos não estão mais disponíveis.');
    
    expect(createOpenPixCharge).not.toHaveBeenCalled();
  });
});
