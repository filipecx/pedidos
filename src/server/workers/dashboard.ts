import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { allQueues } from '../queues';
import { createChildLogger } from '@/lib/logger';

const log = createChildLogger('bull-board');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

console.log('[Bull-Board] Filas registradas:', allQueues.map(q => q.name));

createBullBoard({
  queues: allQueues.map((q) => new BullMQAdapter(q)),
  serverAdapter,
});

const app = express();
const port = Number(process.env.BULL_BOARD_PORT || 3001);

app.use('/admin/queues', serverAdapter.getRouter());

app.get('/', (_req, res) => {
  res.redirect('/admin/queues');
});

app.listen(port, () => {
  console.log(`\n🚀 [Bull-Board] Painel de filas rodando em: http://localhost:${port}/admin/queues\n`);
  log.info({ port, url: `http://localhost:${port}/admin/queues` }, 'Bull-Board Dashboard iniciado com sucesso');
});
