import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import './email.worker';
import './outbox.worker';
import './reconciliation.worker';
import './image.worker';
import './order-expiration.worker';
import './auto-completion.worker';

import { startOutboxRelayCron } from '../queues/outbox.queue';
import { startReconciliationCron } from '../queues/reconciliation.queue';
import { startAutoCompletionCron } from '../queues/auto-completion.queue';
import { createChildLogger } from '@/lib/logger';

const log = createChildLogger('workers-runner');

log.info('👷 Todos os workers (Email, Outbox Relay, Reconciliação, Imagens, Expiração, Auto-Conclusão) iniciados em processo consolidado.');

// Inicia os agendamentos automáticos dos crons no BullMQ
startOutboxRelayCron().catch((err) => {
  log.error({ err }, 'Erro ao agendar cron do Outbox Relay');
});

startReconciliationCron().catch((err) => {
  log.error({ err }, 'Erro ao agendar cron de Reconciliação');
});

startAutoCompletionCron().catch((err) => {
  log.error({ err }, 'Erro ao agendar cron de Auto-Conclusão de pedidos');
});
