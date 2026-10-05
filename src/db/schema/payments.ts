import { pgTable, text, timestamp, uuid, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { orders } from './orders';

export const paymentStatusEnum = pgEnum('payment_status', [
  'INITIATED',
  'WAITING_PAYMENT',
  'PAID',
  'EXPIRED',
  'FAILED',
  'REFUNDED'
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  status: paymentStatusEnum('status').notNull().default('INITIATED'),
  pspProvider: text('psp_provider').notNull().default('OPENPIX'),
  pspReferenceId: text('psp_reference_id'), // ID da cobrança gerada na OpenPix
  idempotencyKey: uuid('idempotency_key').notNull().unique(), // Chave enviada p/ OpenPix
  
  qrCodeUrl: text('qr_code_url'),
  pixCopyPaste: text('pix_copy_paste'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  status: paymentStatusEnum('status').notNull(),
  payload: jsonb('payload'), // Logs extras (ex: resposta crua do webhook)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// INBOX (Webhooks)
export const webhookInbox = pgTable('webhook_inbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  pspEventId: text('psp_event_id').notNull().unique(), // Previne duplicidade do webhook
  provider: text('provider').notNull().default('OPENPIX'),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// OUTBOX (Internal Domain Events)
export const outboxStatusEnum = pgEnum('outbox_status', ['PENDING', 'PROCESSED', 'FAILED']);

export const eventsOutbox = pgTable('events_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  aggregateType: text('aggregate_type').notNull(), // ex: 'PAYMENT'
  aggregateId: uuid('aggregate_id').notNull(),     // ex: id do pagamento
  eventType: text('event_type').notNull(),         // ex: 'PAYMENT_CONFIRMED'
  payload: jsonb('payload').notNull(),
  status: outboxStatusEnum('status').notNull().default('PENDING'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type WebhookInbox = typeof webhookInbox.$inferSelect;
export type EventOutbox = typeof eventsOutbox.$inferSelect;
