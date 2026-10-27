import { z } from 'zod';

// ==========================================
// INPUT SCHEMAS (Request para a OpenPix)
// ==========================================

export const openpixCustomerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  taxID: z.string().optional(), // CPF do cliente (Opcional para reduzir atrito)
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export const openpixSplitSchema = z.object({
  pixKey: z.string().min(1, 'A chave PIX do split é obrigatória'),
  value: z.number().int().positive('O valor do split deve ser um inteiro positivo em centavos'),
});

export const createChargeInputSchema = z.object({
  correlationID: z.string().uuid('correlationID deve ser um UUID válido'),
  value: z.number().int().positive('O valor deve ser um inteiro positivo em centavos'),
  comment: z.string().optional(),
  customer: openpixCustomerSchema.optional(),
  splits: z.array(openpixSplitSchema).optional(),
});

export type CreateChargeInput = z.infer<typeof createChargeInputSchema>;

// ==========================================
// OUTPUT SCHEMAS (Response da OpenPix)
// ==========================================

export const openpixChargeSchema = z.object({
  value: z.number().int(),
  correlationID: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELED', 'REFUNDED']).catch('ACTIVE'),
  paymentLinkUrl: z.string().url().nullable().optional(),
  qrCodeImage: z.string().url().nullable().optional(),
  brCode: z.string().min(1, 'Pix Copia e Cola ausente').nullable().optional(),
  expiresIn: z.number().optional(), 
  createdAt: z.string().datetime().optional(),
});

export const createChargeOutputSchema = z.object({
  charge: openpixChargeSchema,
});

export type CreateChargeOutput = z.infer<typeof createChargeOutputSchema>;
export type OpenPixCharge = z.infer<typeof openpixChargeSchema>;

// ==========================================
// WEBHOOK SCHEMAS (Recebimento de Eventos)
// ==========================================

export const openpixWebhookPayloadSchema = z.object({
  event: z.string(), // ex: 'OPENPIX:CHARGE_COMPLETED' ou 'OPENPIX:CHARGE_REFUNDED'
  charge: openpixChargeSchema.optional(),
  refund: z.object({
    status: z.string().optional(),
    value: z.number().int().optional(),
    correlationID: z.string().optional(),
  }).optional(),
}).passthrough(); // Aceita campos extras enviados pelo PSP

export type OpenPixWebhookPayload = z.infer<typeof openpixWebhookPayloadSchema>;

// ==========================================
// REFUND SCHEMAS (Estorno na OpenPix)
// ==========================================

export const refundChargeInputSchema = z.object({
  correlationID: z.string().uuid('correlationID deve ser um UUID válido'),
  value: z.number().int().positive('O valor do estorno deve ser um inteiro positivo em centavos'),
  comment: z.string().optional(),
});

export type RefundChargeInput = z.infer<typeof refundChargeInputSchema>;

export const refundChargeOutputSchema = z.object({
  refund: z.object({
    status: z.string(),
    value: z.number().int().optional(),
    correlationID: z.string().optional(),
    time: z.string().optional(),
  }).passthrough().optional(),
  error: z.string().optional(),
}).passthrough();

export type RefundChargeOutput = z.infer<typeof refundChargeOutputSchema>;

