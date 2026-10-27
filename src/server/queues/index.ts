import { emailQueue } from './email.queue';
import { outboxQueue } from './outbox.queue';
import { reconciliationQueue } from './reconciliation.queue';
import { imageQueue } from './image.queue';

export * from './email.queue';
export * from './outbox.queue';
export * from './reconciliation.queue';
export * from './image.queue';

/**
 * Lista de todas as filas ativas no sistema para registro no Bull-Board e monitoramento.
 */
export const allQueues = [
  emailQueue,
  outboxQueue,
  reconciliationQueue,
  imageQueue,
];
