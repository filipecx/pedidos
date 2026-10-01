import { pgTable, text, timestamp, uuid, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { user } from './users';

export const planTypeEnum = pgEnum('plan_type', ['PERCENTAGE', 'MONTHLY']);

export const stores = pgTable('stores', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  bannerUrl: text('banner_url'),
  profileUrl: text('profile_url'),
  pixKey: text('pix_key'),
  businessHours: jsonb('business_hours'),
  planType: planTypeEnum('plan_type').default('PERCENTAGE').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
