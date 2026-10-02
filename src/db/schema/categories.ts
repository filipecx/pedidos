import { pgTable, text, timestamp, uuid, uniqueIndex, integer } from 'drizzle-orm/pg-core';
import { stores } from './stores';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  displayOrder: integer('display_order').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => {
  return {
    // Um lojista não pode ter duas categorias com o mesmo slug (ex: "bolos" e "bolos")
    storeSlugIdx: uniqueIndex('store_category_slug_idx').on(table.storeId, table.slug),
  };
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
