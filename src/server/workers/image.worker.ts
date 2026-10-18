import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { Worker } from 'bullmq';
import { redis } from '@/lib/redis';
import { db } from '@/db';
import { products } from '@/db/schema/products';
import { stores } from '@/db/schema/stores';
import { eq } from 'drizzle-orm';
import { processImage } from '../modules/products/lib/image-processor';
import { uploadImage } from '../modules/products/s3client';
import type { ProcessImageJobPayload } from '../queues/image.queue';
import { createChildLogger } from '@/lib/logger';
import { cleanupTempFile } from '../common/file-storage';

const log = createChildLogger('image-worker');

log.info('👷 Worker de Processamento de Imagens iniciado. Aguardando tarefas...');

export const imageWorker = new Worker<ProcessImageJobPayload>(
  'images',
  async (job) => {
    const { targetType, targetId, tempFilePath, bufferBase64, fileName } = job.data;
    log.info({ jobId: job.id, targetType, targetId, fileName, hasTempFile: !!tempFilePath }, 'Iniciando processamento de imagem');

    try {
      let input: Buffer | string;
      if (tempFilePath) {
        input = tempFilePath;
      } else if (bufferBase64) {
        input = Buffer.from(bufferBase64, 'base64');
      } else {
        throw new Error(`Nenhum arquivo ou buffer fornecido para job ${job.id}`);
      }

      const processed = await processImage(input);

      if (!processed || !processed.buffer) {
        throw new Error(`Falha ao otimizar imagem com sharp para job ${job.id}`);
      }

      const publicUrl = await uploadImage(processed.buffer, fileName, 'image/webp');
      log.info({ jobId: job.id, publicUrl }, 'Upload de imagem concluído com sucesso');

      // Atualiza a entidade no banco de dados de acordo com o targetType
      if (targetType === 'product') {
        await db.update(products).set({
          imageUrl: publicUrl,
          updatedAt: new Date(),
        }).where(eq(products.id, targetId));
      } else if (targetType === 'store-profile') {
        await db.update(stores).set({
          profileUrl: publicUrl,
          updatedAt: new Date(),
        }).where(eq(stores.id, targetId));
      } else if (targetType === 'store-banner') {
        await db.update(stores).set({
          bannerUrl: publicUrl,
          updatedAt: new Date(),
        }).where(eq(stores.id, targetId));
      }

      log.info({ jobId: job.id, targetType, targetId }, 'Entidade atualizada com nova imagem no banco de dados');
      return { success: true, url: publicUrl };
    } finally {
      // Limpeza imediata do arquivo temporário no disco, caso exista
      if (tempFilePath) {
        await cleanupTempFile(tempFilePath);
        log.debug({ tempFilePath }, 'Arquivo temporário de upload removido do disco');
      }
    }
  },
  {
    connection: redis,
    concurrency: 3, // Processa até 3 imagens em paralelo
  }
);

imageWorker.on('completed', (job, result) => {
  log.info({ jobId: job.id, result }, '✅ Imagem processada e salva com sucesso');
});

imageWorker.on('failed', (job, err) => {
  log.error({ jobId: job?.id, error: err.message }, '❌ Falha ao processar job de imagem');
});
