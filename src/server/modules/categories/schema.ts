import { z } from "zod";

export const categoryBaseSchema = z.object({
  name: z.string().min(2, "O nome da categoria deve ter no mínimo 2 caracteres"),
  slug: z
    .string()
    .min(2, "O slug deve ter no mínimo 2 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "O slug deve conter apenas letras minúsculas, números e hífens"
    ),
  description: z.string().optional(),
});

export const createCategorySchema = categoryBaseSchema;

export const updateCategorySchema = categoryBaseSchema.extend({
  id: z.string().uuid("ID de categoria inválido"),
});

export const reorderCategoryItemSchema = z.object({
  id: z.string().uuid(),
  displayOrder: z.number().int().min(0),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(reorderCategoryItemSchema),
});
