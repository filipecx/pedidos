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

const log = createChildLogger('image-worker');

log.info('👷 Worker de Processamento de Imagens iniciado. Aguardando tarefas...');

export const imageWorker = new Worker<ProcessImageJobPayload>(
  'images',
  async (job) => {
    const { targetType, targetId, bufferBase64, fileName } = job.data;
    log.info({ jobId: job.id, targetType, targetId, fileName }, 'Iniciando processamento de imagem');

    const inputBuffer = Buffer.from(bufferBase64, 'base64');
    const processed = await processImage(inputBuffer);

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
