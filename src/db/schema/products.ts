import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { stores } from './stores';
import { categories } from './categories';

// 1. Tabela Principal: Produtos
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  storeId: uuid('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'cascade' }),
    
  name: text('name').notNull(),
  description: text('description'),
  basePriceCents: integer('base_price_cents').notNull().default(0),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  
  // Regras de Disponibilidade (Pode ser os dois ao mesmo tempo)
  isProntaEntrega: boolean('is_pronta_entrega').notNull().default(false),
  stockQuantity: integer('stock_quantity'), // Preenchido apenas se isProntaEntrega = true
  
  isEncomenda: boolean('is_encomenda').notNull().default(false),
  preparationTimeDays: integer('preparation_time_days'), // Preenchido apenas se isEncomenda = true
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. Grupos de Modificadores (Ex: "Escolha o Recheio", "Bebidas do Combo")
export const productModifierGroups = pgTable('product_modifier_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
    
  name: text('name').notNull(), // "Tamanho", "Adicionais", "Sabor"
  isRequired: boolean('is_required').notNull().default(false),
  minChoices: integer('min_choices').notNull().default(0),
  maxChoices: integer('max_choices').notNull().default(1),
  displayOrder: integer('display_order').notNull().default(0),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. Opções dentro do Grupo (Ex: "Pequeno", "Nutella", "Coca-Cola")
export const productModifierItems = pgTable('product_modifier_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id')
    .notNull()
    .references(() => productModifierGroups.id, { onDelete: 'cascade' }),
    
  name: text('name').notNull(),
  additionalPriceCents: integer('additional_price_cents').notNull().default(0), // Preço extra (pode ser 0 para combos)
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true), // Para poder desativar um ingrediente que acabou
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type ProductModifierGroup = typeof productModifierGroups.$inferSelect;
export type ProductModifierItem = typeof productModifierItems.$inferSelect;
