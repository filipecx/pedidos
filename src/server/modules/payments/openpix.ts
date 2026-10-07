import crypto from 'crypto';
import { 
  CreateChargeInput, 
  createChargeInputSchema, 
  CreateChargeOutput, 
  createChargeOutputSchema,
  OpenPixCharge,
  openpixChargeSchema
} from './openpix-schema';

// URL base da OpenPix (se houver ambiente de Sandbox específico, ajustamos via env)
const OPENPIX_API_URL = process.env.OPENPIX_API_URL || 'https://api.openpix.com.br/api/v1';

/**
 * Função Pura: Cria uma cobrança Pix (Charge) na OpenPix
 */
export async function createOpenPixCharge(input: CreateChargeInput): Promise<CreateChargeOutput> {
  const appId = process.env.OPENPIX_APP_ID;
  if (!appId) {
    throw new Error('Missing OPENPIX_APP_ID environment variable.');
  }

  // Anti-Corruption Layer: Valida os dados ANTES de enviar ao PSP
  const safeInput = createChargeInputSchema.parse(input);

  const response = await fetch(`${OPENPIX_API_URL}/charge`, {
    method: 'POST',
    headers: {
      'Authorization': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      correlationID: safeInput.correlationID,
      value: safeInput.value,
      comment: safeInput.comment,
      customer: safeInput.customer,
      splits: safeInput.splits,
      // expiresIn: 900 // Opcional: expira em 15 minutos (900s)
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[OpenPix Error]', response.status, errorBody);
    throw new Error(`Failed to create charge in OpenPix: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Anti-Corruption Layer: Valida os dados de SAÍDA (Garante que a API não mudou o contrato que esperamos)
  return createChargeOutputSchema.parse(data);
}

/**
 * Função Pura: Consulta o status atual de uma cobrança na OpenPix usando o correlationID
 */
export async function getOpenPixChargeByCorrelationId(correlationId: string): Promise<OpenPixCharge | null> {
  const appId = process.env.OPENPIX_APP_ID;
  if (!appId) throw new Error('Missing OPENPIX_APP_ID');

  const response = await fetch(`${OPENPIX_API_URL}/charge?correlationID=${correlationId}`, {
    method: 'GET',
    headers: {
      'Authorization': appId,
    },
  });

  if (!response.ok) {
    console.error(`[OpenPix Error] Failed to fetch charge ${correlationId}`);
    return null;
  }

  const data = await response.json();
  // A API da OpenPix retorna uma lista "charges" quando buscamos via querystring
  const charge = data.charges?.[0];

  if (!charge) return null;

  return openpixChargeSchema.parse(charge);
}

/**
 * Verifica a assinatura HMAC enviada no Webhook da OpenPix
 * Evita que usuários maliciosos falsifiquem chamadas dizendo que pagaram.
 */
export function verifyWebhookSignature(signatureHeader: string, rawBody: string): boolean {
  const webhookSecret = process.env.OPENPIX_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('OPENPIX_WEBHOOK_SECRET is not defined. Skipping signature verification.');
    // Retornamos true apenas para não travar ambiente dev sem configuração, mas em PROD é crítico
    return process.env.NODE_ENV !== 'production';
  }

  // A OpenPix (via Woovi) usa HMAC-SHA1 para assinar webhooks
  const computedSignatureSha1 = crypto
    .createHmac('sha1', webhookSecret)
    .update(rawBody)
    .digest('base64');

  try {
    const expectedBuffer = Buffer.from(signatureHeader, 'base64');
    const computedBuffer = Buffer.from(computedSignatureSha1, 'base64');

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch (err) {
    console.error('[Webhook Auth Debug] Error verifying signature:', err);
    return false;
  }
}
