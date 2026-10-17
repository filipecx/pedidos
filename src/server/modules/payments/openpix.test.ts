import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyWebhookSignature } from './openpix';
import { createChargeInputSchema } from './openpix-schema';
import crypto from 'crypto';

describe('OpenPix Domain Rules & Anti-Fraud', () => {
  const SECRET = 'my-super-secret-webhook-key';
  
  beforeEach(() => {
    vi.stubEnv('OPENPIX_WEBHOOK_SECRET', SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('verifyWebhookSignature', () => {
    it('deve validar uma assinatura autêntica da OpenPix', () => {
      const payload = JSON.stringify({ event: 'CHARGE_COMPLETED', charge: { value: 1000 } });
      
      // Simulamos como a OpenPix gera a assinatura (HMAC-SHA1)
      const validSignature = crypto
        .createHmac('sha1', SECRET)
        .update(payload)
        .digest('base64');

      const isValid = verifyWebhookSignature(validSignature, payload);
      expect(isValid).toBe(true);
    });

    it('deve rejeitar uma assinatura forjada (Hacker tentando aprovar pagamento)', () => {
      const payload = JSON.stringify({ event: 'CHARGE_COMPLETED', charge: { value: 5000 } });
      
      const fakeSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('base64');

      const isValid = verifyWebhookSignature(fakeSignature, payload);
      expect(isValid).toBe(false);
    });

    it('deve rejeitar se o payload for alterado depois de assinado (Man in the middle)', () => {
      const originalPayload = JSON.stringify({ event: 'CHARGE_COMPLETED', charge: { value: 1000 } });
      
      const validSignature = crypto
        .createHmac('sha256', SECRET)
        .update(originalPayload)
        .digest('base64');

      // Hacker muda o valor de 1000 para 5000 no meio do caminho, mas mantém a assinatura
      const manipulatedPayload = JSON.stringify({ event: 'CHARGE_COMPLETED', charge: { value: 5000 } });

      const isValid = verifyWebhookSignature(validSignature, manipulatedPayload);
      expect(isValid).toBe(false);
    });
  });

  describe('OpenPix Schemas (Anti-Corruption Layer)', () => {
    it('deve exigir correlationID como UUID', () => {
      const input = {
        correlationID: 'not-a-uuid',
        value: 1000,
      };

      const result = createChargeInputSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UUID válido');
      }
    });

    it('deve rejeitar valores negativos ou quebrados (deve ser em centavos)', () => {
      const input = {
        correlationID: crypto.randomUUID(),
        value: -100, // negativo
      };
      const result = createChargeInputSchema.safeParse(input);
      expect(result.success).toBe(false);

      const inputFloat = {
        correlationID: crypto.randomUUID(),
        value: 10.50, // quebrado (R$ 10,50 ao invés de 1050 centavos)
      };
      const resultFloat = createChargeInputSchema.safeParse(inputFloat);
      expect(resultFloat.success).toBe(false);
    });

    it('deve passar com um payload válido', () => {
      const input = {
        correlationID: crypto.randomUUID(),
        value: 15000, // R$ 150,00
        customer: {
          name: 'Filipe',
        } // CPF ausente (Regra de não-atrito)
      };

      const result = createChargeInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('deve validar schemas de refund (Anti-Corruption Layer)', async () => {
      const { refundChargeInputSchema, refundChargeOutputSchema } = await import('./openpix-schema');

      // Teste input inválido (correlationID não UUID)
      const invalidInput = {
        correlationID: 'invalid-id',
        value: 5000,
      };
      expect(refundChargeInputSchema.safeParse(invalidInput).success).toBe(false);

      // Teste input inválido (valor negativo)
      const invalidValueInput = {
        correlationID: crypto.randomUUID(),
        value: -500,
      };
      expect(refundChargeInputSchema.safeParse(invalidValueInput).success).toBe(false);

      // Teste input válido
      const validInput = {
        correlationID: crypto.randomUUID(),
        value: 5000,
        comment: 'Cancelamento pelo lojista',
      };
      expect(refundChargeInputSchema.safeParse(validInput).success).toBe(true);

      // Teste output do PSP
      const validOutput = {
        refund: {
          status: 'COMPLETED',
          value: 5000,
          correlationID: validInput.correlationID,
        },
      };
      expect(refundChargeOutputSchema.safeParse(validOutput).success).toBe(true);
    });
  });
});
