import crypto from 'crypto';
import { 
  CreateChargeInput, 
  createChargeInputSchema, 
  CreateChargeOutput, 
  createChargeOutputSchema 
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

  // OpenPix assina o rawBody usando HMAC-SHA256
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('base64'); // A documentação OpenPix normalmente usa base64 ou hex, precisamos garantir o formato (na v1, base64)

  // Comparação segura contra timing-attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader),
      Buffer.from(computedSignature)
    );
  } catch {
    return false; // Se der erro de tamanho de buffer, a assinatura é inválida
  }
}
