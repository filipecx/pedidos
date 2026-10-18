import { createWriteStream, promises as fs } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";
import crypto from "crypto";

const UPLOAD_TEMP_DIR = process.env.UPLOAD_TEMP_DIR || "/tmp/uploads";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface StreamToTempResult {
  filePath: string;
  sizeBytes: number;
}

/**
 * Garante que o diretório temporário para uploads exista.
 */
export async function ensureUploadTempDir(): Promise<string> {
  await fs.mkdir(UPLOAD_TEMP_DIR, { recursive: true });
  return UPLOAD_TEMP_DIR;
}

/**
 * Salva um File/Blob em streaming diretamente no disco temporário,
 * validando tipo MIME e tamanho máximo sem carregar o arquivo inteiro na memória RAM.
 */
export async function streamFileToDisk(
  file: File,
  prefix: string = "upload"
): Promise<StreamToTempResult> {
  // 1. Validação prévia de tamanho
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(
      `Arquivo excede o limite máximo permitido de ${MAX_IMAGE_FILE_SIZE / (1024 * 1024)}MB.`
    );
  }

  // 2. Validação estrita de MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as AllowedImageMimeType)) {
    throw new Error(
      `Tipo de arquivo não suportado: "${file.type}". Formatos permitidos: JPG, PNG, WEBP.`
    );
  }

  await ensureUploadTempDir();

  const fileExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const uniqueId = crypto.randomUUID();
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
  const tempFileName = `${safePrefix}-${uniqueId}.${fileExt}`;
  const targetPath = path.join(UPLOAD_TEMP_DIR, tempFileName);

  let nodeReadable: Readable;
  if (typeof file.stream === "function") {
    nodeReadable = Readable.fromWeb(file.stream() as any);
  } else if (typeof file.arrayBuffer === "function") {
    const ab = await file.arrayBuffer();
    nodeReadable = Readable.from(Buffer.from(ab));
  } else {
    throw new Error("Objeto de arquivo inválido para streaming.");
  }

  const writeStream = createWriteStream(targetPath);

  let writtenBytes = 0;
  nodeReadable.on("data", (chunk: Buffer) => {
    writtenBytes += chunk.length;
    if (writtenBytes > MAX_IMAGE_FILE_SIZE) {
      writeStream.destroy(
        new Error(`Upload interrompido: o arquivo excedeu o limite de 10MB durante o streaming.`)
      );
    }
  });

  try {
    await pipeline(nodeReadable, writeStream);
  } catch (err) {
    // Limpa arquivo parcial em caso de falha no stream
    await fs.unlink(targetPath).catch(() => {});
    throw err;
  }

  return {
    filePath: targetPath,
    sizeBytes: writtenBytes,
  };
}

/**
 * Remove com segurança o arquivo temporário do disco.
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // Ignora se o arquivo já tiver sido removido
  }
}
