import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOrderAction } from './actions';
import { db } from '@/db';
import { createOpenPixCharge } from '../payments/openpix';
import { redis } from '@/lib/redis';

// 1. Mocks
const mocks = vi.hoisted(() => {
  const chainable = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'mocked-uuid' }]),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  // Permite que where() seja tanto awaited quanto encadeado com .returning()
  (chainable.where as any).returning = vi.fn().mockResolvedValue([{ id: 'mocked-uuid' }]);
  (chainable.where as any).then = (resolve: any) => Promise.resolve([]).then(resolve);

  return { chainable };
});

vi.mock('@/db', () => ({
  db: {
    query: {
      products: { findMany: vi.fn() },
      stores: { findFirst: vi.fn() },
      orderItems: { findMany: vi.fn().mockResolvedValue([]) },
    },
    transaction: vi.fn(async (cb) => cb({
      insert: vi.fn().mockReturnValue(mocks.chainable),
      update: vi.fn().mockReturnValue(mocks.chainable),
      query: {
        orderItems: { findMany: vi.fn().mockResolvedValue([]) },
      },
    })),
    update: vi.fn().mockReturnValue(mocks.chainable),
  },
}));

vi.mock('../payments/openpix', () => ({
  createOpenPixCharge: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  redis: {
    publish: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('@/server/queues/order-expiration.queue', () => ({
  scheduleOrderExpiration: vi.fn().mockResolvedValue(undefined),
}));

describe('Integration Tests: Checkout & Payments Flow', () => {
  const mockStoreId = '123e4567-e89b-12d3-a456-426614174000';
  const mockProductId = '123e4567-e89b-12d3-a456-426614174001';
  const mockStore = {
    id: mockStoreId,
    passFeeToCustomer: false,
    transactionFeeCents: 0,
    pixKey: 'lojista@pix.com',
  };
  
  const defaultPayload = {
    storeId: mockStoreId,
    customerName: 'Cliente Teste',
    customerPhone: '11999999999',
    deliveryMethod: 'PICKUP' as const,
    cartType: 'pronta_entrega' as const,
    items: [{ productId: mockProductId, quantity: 2 }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default happy path setup
    (db.query.stores.findFirst as any).mockResolvedValue(mockStore);
    (db.query.products.findMany as any).mockResolvedValue([
      { id: mockProductId, name: 'Bolo', basePriceCents: 5000 }
    ]);
    (createOpenPixCharge as any).mockResolvedValue({
      charge: {
        correlationID: 'mock-correl-id',
        brCode: 'pix-copia-cola-123',
        qrCodeImage: 'http://qr.com',
        expiresIn: 3600
      }
    });
  });

  it('1. Prevenção de Tampering: Deve ignorar preços do frontend e usar do DB', async () => {
    const result = await createOrderAction(defaultPayload);

    expect(result.success).toBe(true);
    // 2 * 5000 (do BD) = 10000 + 0 delivery = 10000
    expect(createOpenPixCharge).toHaveBeenCalledWith(
      expect.objectContaining({ value: 10000 })
    );
  });

  it('2. Produtos Inexistentes: Deve bloquear checkout se o produto não existir no BD', async () => {
    (db.query.products.findMany as any).mockResolvedValue([]); // Retorna vazio

    const result = await createOrderAction(defaultPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Alguns produtos não estão mais disponíveis.');
    expect(db.transaction).not.toHaveBeenCalled();
    expect(createOpenPixCharge).not.toHaveBeenCalled();
  });

  it('4. Resiliência: Deve tentar 3 vezes se a OpenPix falhar e atualizar o banco para FAILED', async () => {
    // Força falha nas 3 tentativas
    (createOpenPixCharge as any)
      .mockRejectedValue(new Error('Timeout na API OpenPix'));
    
    // Diminui o tempo de espera (backoff) no setTimeout para o teste rodar rápido
    vi.useFakeTimers();

    const orderPromise = createOrderAction(defaultPayload);
    
    // Avança o tempo virtual para pular os retries rápidos
    await vi.runAllTimersAsync();
    
    const result = await orderPromise;
    vi.useRealTimers();

    expect(createOpenPixCharge).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Serviço de pagamento indisponível/);
    
    // Garante que marcou o pagamento como FAILED
    expect(db.update).toHaveBeenCalled();
    expect(mocks.chainable.set).toHaveBeenCalledWith({ status: 'FAILED' });
  });

  it('4.1 Resiliência: Deve recuperar com sucesso se OpenPix falhar na 1ª tentativa', async () => {
    (createOpenPixCharge as any)
      .mockRejectedValueOnce(new Error('Timeout')) // Falha 1ª
      .mockResolvedValueOnce({                     // Passa na 2ª
        charge: { correlationID: 'recovered', brCode: 'br123', qrCodeImage: 'url' }
      });
      
    vi.useFakeTimers();
    const orderPromise = createOrderAction(defaultPayload);
    await vi.runAllTimersAsync();
    const result = await orderPromise;
    vi.useRealTimers();

    expect(result.success).toBe(true);
    expect(createOpenPixCharge).toHaveBeenCalledTimes(2);
    // Garante que salvou o sucesso
    expect(mocks.chainable.set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'WAITING_PAYMENT',
      pspReferenceId: 'recovered'
    }));
  });

  it('5. Split & Taxas: Deve repassar taxa ao cliente e montar os splits corretamente', async () => {
    (db.query.stores.findFirst as any).mockResolvedValue({
      id: mockStoreId,
      passFeeToCustomer: true,
      transactionFeeCents: 300, // R$3 de taxa
      pixKey: 'lojista@pix.com',
    });

    const result = await createOrderAction(defaultPayload);

    expect(result.success).toBe(true);
    
    // 2 * 5000 = 10000 + 300 taxa repassada = 10300
    // Lojista fica com 10300 - 300 = 10000
    expect(createOpenPixCharge).toHaveBeenCalledWith(
      expect.objectContaining({ 
        value: 10300,
        splits: [{ pixKey: 'lojista@pix.com', value: 10000 }]
      })
    );
  });

  it('6. SSE: Deve disparar notificação via Redis após sucesso', async () => {
    const result = await createOrderAction(defaultPayload);

    expect(result.success).toBe(true);
    expect(redis.publish).toHaveBeenCalledWith(
      `store-orders:${mockStoreId}`,
      JSON.stringify({ 
        type: "REFRESH",
        orderId: 'mocked-uuid',
        cartType: 'pronta_entrega',
      })
    );
  });

  it('7. Endereço de Entrega: Deve exigir endereço completo quando deliveryMethod for DELIVERY', async () => {
    const invalidPayload = {
      ...defaultPayload,
      deliveryMethod: 'DELIVERY' as const,
    };

    const result = await createOrderAction(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Dados inválidos no checkout');
    expect(result.fieldErrors?.deliveryAddress).toBeDefined();

    const validDeliveryPayload = {
      ...defaultPayload,
      deliveryMethod: 'DELIVERY' as const,
      deliveryAddress: {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        complement: 'Apto 101',
      },
    };

    const validResult = await createOrderAction(validDeliveryPayload);
    expect(validResult.success).toBe(true);
  });

  it('8. Horário / Status: Deve impedir checkout se a loja estiver fechada', async () => {
    (db.query.stores.findFirst as any).mockResolvedValue({
      ...mockStore,
      manualIsOpen: false,
    });

    const result = await createOrderAction(defaultPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('loja está fechada');
  });

  it('9. Loja Suspensa: Deve impedir checkout se a loja estiver desativada pelo Admin (isActive: false)', async () => {
    (db.query.stores.findFirst as any).mockResolvedValue({
      ...mockStore,
      isActive: false,
    });

    const result = await createOrderAction(defaultPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não está disponível');
  });

  it('10. Modalidade Inválida: Deve impedir compra de produto exclusivo de encomenda no carrinho de pronta-entrega', async () => {
    (db.query.products.findMany as any).mockResolvedValue([
      { id: mockProductId, name: 'Bolo de Casamento', basePriceCents: 25000, isProntaEntrega: false, isEncomenda: true }
    ]);

    const result = await createOrderAction(defaultPayload);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não está disponível na modalidade selecionada');
  });
});

