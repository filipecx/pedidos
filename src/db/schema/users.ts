import { pgEnum, pgTable, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'LOJISTA', 'CLIENTE']);

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: boolean('email_verified').notNull(),
  image: text('image'),
  
  // Campos customizados do negócio
  phone: text('phone'),
  role: userRoleEnum('role').default('CLIENTE').notNull(),
  
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
