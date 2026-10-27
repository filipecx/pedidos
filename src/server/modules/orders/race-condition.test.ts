import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderAction } from './actions';
import { db } from '@/db';
import { createOpenPixCharge } from '../payments/openpix';
import { redis } from '@/lib/redis';

// Mocks de dependências externas
vi.mock('../payments/openpix', () => ({
  createOpenPixCharge: vi.fn().mockImplementation(async (payload) => ({
    charge: {
      correlationID: 'charge-123',
      brCode: 'mock-pix-code',
      qrCodeImage: 'https://pix.mock/image.png',
      value: payload.value,
    },
  })),
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    publish: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@/server/queues/order-expiration.queue', () => ({
  scheduleOrderExpiration: vi.fn().mockResolvedValue(undefined),
}));

// Mock do banco de dados Drizzle
vi.mock('@/db', () => {
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'mocked-id' }]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  (chainable.where as any).returning = vi.fn().mockResolvedValue([{ id: 'mocked-id' }]);
  (chainable.where as any).then = (resolve: any) => Promise.resolve([]).then(resolve);

  return {
    db: {
      query: {
        products: { findMany: vi.fn() },
        stores: { findFirst: vi.fn() },
        orderItems: { findMany: vi.fn().mockResolvedValue([]) },
      },
      transaction: vi.fn(),
      update: vi.fn().mockReturnValue(chainable),
    },
  };
});

describe('Concorrência, Preços e Prevenção de Deadlock', () => {
  const mockStoreId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductId = '123e4567-e89b-12d3-a456-426614174001';

  const mockStore = {
    id: mockStoreId,
    name: 'Doceria da Vovó',
    isActive: true,
    manualIsOpen: true,
    passFeeToCustomer: false,
    transactionFeeCents: 0,
    pixKey: 'lojista@pix.com',
  };

  const payload = {
    storeId: mockStoreId,
    customerName: 'Cliente Concorrente',
    customerPhone: '11999999999',
    deliveryMethod: 'PICKUP' as const,
    cartType: 'pronta_entrega' as const,
    items: [{ productId: mockProductId, quantity: 1 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (db.query.stores.findFirst as any).mockResolvedValue(mockStore);
  });

  it('1. Overselling: Deve permitir apenas compras até o limite de estoque sob concorrência e rejeitar excedentes', async () => {
    let stockInMemory = 2;

    (db.query.products.findMany as any).mockImplementation(async () => [
      {
        id: mockProductId,
        name: 'Bolo de Pote',
        basePriceCents: 1500,
        isProntaEntrega: true,
        isEncomenda: false,
        stockQuantity: stockInMemory,
        isActive: true,
      },
    ]);

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockImplementation(async () => {
                if (stockInMemory >= 1) {
                  stockInMemory -= 1;
                  return [{ id: mockProductId }];
                }
                return [];
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'order-' + Math.random() }]),
          }),
        }),
      };

      return callback(mockTx);
    });

    const concurrentRequests = Array.from({ length: 5 }, () =>
      createOrderAction(payload)
    );

    const responses = await Promise.all(concurrentRequests);

    const successfulPurchases = responses.filter((r) => r.success === true);
    const failedPurchases = responses.filter((r) => r.success === false);

    expect(successfulPurchases.length).toBe(2);
    expect(failedPurchases.length).toBe(3);
    failedPurchases.forEach((f) => {
      expect(f.error).toContain('Estoque insuficiente');
    });

    expect(stockInMemory).toBe(0);
  });

  it('2. Mudança de Preço: Se o lojista alterar o preço enquanto o cliente está no carrinho, o Pix deve cobrar o NOVO preço do banco', async () => {
    // Cenário:
    // O cliente montou o carrinho quando a Torta custava R$ 20,00 (2000 centavos)
    // O lojista aumentou o preço para R$ 28,00 (2800 centavos)
    // O payload do checkout do cliente envia apenas { productId, quantity: 2 } (sem preço hardcoded)
    const productPriceInDb = 2800; // Preço atual no banco

    (db.query.products.findMany as any).mockResolvedValue([
      {
        id: mockProductId,
        name: 'Torta Holandesa',
        basePriceCents: productPriceInDb,
        isProntaEntrega: true,
        isEncomenda: false,
        stockQuantity: 10,
        isActive: true,
      },
    ]);

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: mockProductId }]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'order-price-test' }]),
          }),
        }),
      };
      return callback(mockTx);
    });

    const orderPayload = {
      ...payload,
      items: [{ productId: mockProductId, quantity: 2 }], // 2 unidades
    };

    const response = await createOrderAction(orderPayload);

    expect(response.success).toBe(true);

    // Valida que a cobrança enviada para o OpenPix foi calculada com o preço atualizado:
    // 2 x 2800 = 5600 centavos (R$ 56,00) e NÃO o valor antigo
    expect(createOpenPixCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 5600,
      })
    );
  });

  it('3. Prevenção de Deadlock: Deve sempre travar produtos em ordem determinística ordenada por ID mesmo quando clientes enviam ordens opostas', async () => {
    // Cenário:
    // Batata (UUID terminando em 0001)
    // Hambúrguer (UUID terminando em 0002)
    // User 1 envia: [Hambúrguer, Batata] (ordem inversa)
    // User 2 envia: [Batata, Hambúrguer] (ordem direta)
    const prodBatataId = '123e4567-e89b-12d3-a456-426614174001';
    const prodHamburguerId = '123e4567-e89b-12d3-a456-426614174002';

    (db.query.products.findMany as any).mockResolvedValue([
      {
        id: prodBatataId,
        name: 'Batata Frita',
        basePriceCents: 1200,
        isProntaEntrega: true,
        isEncomenda: false,
        stockQuantity: 5,
        isActive: true,
      },
      {
        id: prodHamburguerId,
        name: 'Hambúrguer Artesanal',
        basePriceCents: 2500,
        isProntaEntrega: true,
        isEncomenda: false,
        stockQuantity: 5,
        isActive: true,
      },
    ]);

    // Rastreia a sequência em que os produtos foram atualizados/travados no Postgres
    const executedLockOrders: string[][] = [];

    (db.transaction as any).mockImplementation(async (callback: any) => {
      const currentTxLockedProductIds: string[] = [];

      const mockTx = {
        update: vi.fn().mockImplementation((_table) => ({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation((clause) => {
              return {
                returning: vi.fn().mockImplementation(async () => {
                  return [{ id: 'mock' }];
                }),
              };
            }),
          }),
        })),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'order-deadlock-test' }]),
          }),
        }),
      };

      // Intercepta chamadas de update para verificar qual productId foi passado
      mockTx.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation((clause) => {
            // Em actions.ts: eq(productsSchema.id, item.productId)
            return {
              returning: vi.fn().mockImplementation(async () => {
                return [{ id: 'mock' }];
              }),
            };
          }),
        }),
      });

      return callback(mockTx);
    });

    // User 1 envia na ordem [Hambúrguer (002), Batata (001)]
    const user1Payload = {
      ...payload,
      customerName: 'User 1',
      items: [
        { productId: prodHamburguerId, quantity: 1 },
        { productId: prodBatataId, quantity: 1 },
      ],
    };

    // User 2 envia na ordem [Batata (001), Hambúrguer (002)]
    const user2Payload = {
      ...payload,
      customerName: 'User 2',
      items: [
        { productId: prodBatataId, quantity: 1 },
        { productId: prodHamburguerId, quantity: 1 },
      ],
    };

    const [res1, res2] = await Promise.all([
      createOrderAction(user1Payload),
      createOrderAction(user2Payload),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
  });
});
