import crypto from 'crypto';
import { 
  CreateChargeInput, 
  createChargeInputSchema, 
  CreateChargeOutput, 
  createChargeOutputSchema,
  OpenPixCharge,
  openpixChargeSchema,
  RefundChargeInput,
  refundChargeInputSchema,
  RefundChargeOutput,
  refundChargeOutputSchema,
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
      expiresIn: 960, // 16 minutos (15 minutos anunciados + 1 minuto de tolerância)
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
 * Função Pura: Executa o estorno total/parcial de um Pix na OpenPix
 * Endpoint oficial: POST /api/v1/charge/{id}/refund
 */
export async function refundOpenPixCharge(input: RefundChargeInput): Promise<RefundChargeOutput> {
  const appId = process.env.OPENPIX_APP_ID;
  if (!appId) {
    throw new Error('Missing OPENPIX_APP_ID environment variable.');
  }

  // Anti-Corruption Layer: Valida dados antes do envio
  const safeInput = refundChargeInputSchema.parse(input);

  const response = await fetch(`${OPENPIX_API_URL}/charge/${safeInput.correlationID}/refund`, {
    method: 'POST',
    headers: {
      'Authorization': appId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: safeInput.value,
      comment: safeInput.comment || 'Cancelamento e estorno pelo lojista',
      correlationID: safeInput.correlationID,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[OpenPix Refund Error]', response.status, errorBody);
    throw new Error(`Falha ao processar estorno na OpenPix: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return refundChargeOutputSchema.parse(data);
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

export interface PixKeyCheckResult {
  valid: boolean;
  pixKey?: string;
  type?: string;
  owner?: {
    name?: string;
    taxID?: string;
    psp?: string;
  };
  error?: string;
}

/**
 * Consulta a chave Pix no DICT do Banco Central através da OpenPix
 */
export async function checkOpenPixKey(pixKey: string): Promise<PixKeyCheckResult> {
  const appId = process.env.OPENPIX_APP_ID;
  if (!appId) {
    throw new Error('Missing OPENPIX_APP_ID');
  }

  const cleanKey = pixKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'Chave Pix vazia.' };
  }

  try {
    const response = await fetch(`${OPENPIX_API_URL}/pix-keys/check`, {
      method: 'POST',
      headers: {
        'Authorization': appId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pixKey: cleanKey }),
    });

    if (response.status === 404) {
      return { valid: false, error: 'Chave Pix não encontrada no Banco Central. Verifique se os dados estão corretos.' };
    }

    if (response.status === 429) {
      return { valid: false, error: 'Limite de consultas do Banco Central atingido. Aguarde alguns minutos.' };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('[OpenPix Pix-Keys Check Error]', response.status, errText);
      return { valid: false, error: 'Não foi possível validar a chave Pix no momento. Tente novamente mais tarde.' };
    }

    const data = await response.json();
    return {
      valid: true,
      pixKey: data.pixKey || cleanKey,
      type: data.type,
      owner: {
        name: data.owner?.name,
        taxID: data.owner?.taxID,
        psp: data.owner?.psp,
      },
    };
  } catch (error: any) {
    console.error('[OpenPix Check Network Error]:', error);
    return { valid: false, error: 'Erro de conexão ao consultar a chave Pix.' };
  }
}

/**
 * Verifica a assinatura HMAC enviada no Webhook da OpenPix
 * Evita que usuários maliciosos falsifiquem chamadas dizendo que pagaram.
 */
export function verifyWebhookSignature(signatureHeader: string, rawBody: string): boolean {
  const webhookSecret = process.env.OPENPIX_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('OPENPIX_WEBHOOK_SECRET is not defined. Skipping signature verification.');
    return process.env.NODE_ENV !== 'production';
  }

  // 1. Se a OpenPix enviou o token configurado no campo Authorization do webhook (comparação em tempo constante)
  const cleanHeader = signatureHeader.trim();
  const cleanSecret = webhookSecret.trim();
  for (const candidate of [cleanSecret, `Bearer ${cleanSecret}`]) {
    const headerBuf = Buffer.from(cleanHeader, 'utf8');
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (
      headerBuf.length === candidateBuf.length &&
      crypto.timingSafeEqual(headerBuf, candidateBuf)
    ) {
      return true;
    }
  }

  // 2. Se a OpenPix enviou assinatura criptográfica HMAC (SHA256 ou SHA1)
  for (const algo of ['sha256', 'sha1'] as const) {
    const computedSignature = crypto
      .createHmac(algo, webhookSecret)
      .update(rawBody)
      .digest('base64');

    try {
      const expectedBuffer = Buffer.from(signatureHeader, 'base64');
      const computedBuffer = Buffer.from(computedSignature, 'base64');

      if (
        expectedBuffer.length === computedBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, computedBuffer)
      ) {
        return true;
      }
    } catch {
      // Ignora erro de buffer e tenta o próximo
    }
  }

  return false;
}
