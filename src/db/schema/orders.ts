import { pgTable, text, timestamp, uuid, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { user } from './users';

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_PAYMENT',
  'PREPARING',
  'READY',
  'DELIVERED',
  'CANCELED',
]);

export const orderTypeEnum = pgEnum('order_type', [
  'DELIVERY',
  'PICKUP',
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // Pode ser nulo para compras como visitante (guest)
  
  status: orderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
  type: orderTypeEnum('type').notNull(),
  
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerDocument: text('customer_document'), // CPF para Pix

  deliveryAddress: jsonb('delivery_address'), // Endereço de entrega caso seja DELIVERY

  subtotalCents: integer('subtotal_cents').notNull(),
  deliveryFeeCents: integer('delivery_fee_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(), 
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  totalPriceCents: integer('total_price_cents').notNull(),
  modifiers: jsonb('modifiers'), // Combos e adicionais
  notes: text('notes'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
