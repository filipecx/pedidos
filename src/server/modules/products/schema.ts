import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid("ID da categoria inválido").optional().nullable().or(z.literal("")),
  name: z.string().min(2, "O nome do produto deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0, "O preço não pode ser negativo"),
  imageUrl: z.string().url("URL de imagem inválida").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  
  isProntaEntrega: z.boolean().default(false),
  isEncomenda: z.boolean().default(false),
  isCombo: z.boolean().default(false),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  preparationTimeDays: z.number().int().min(1).optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.isProntaEntrega && !data.isEncomenda) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "O produto deve ser de pronta-entrega ou encomenda",
      path: ["isProntaEntrega"],
    });
  }

  if (data.isProntaEntrega && (data.stockQuantity === undefined || data.stockQuantity === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Estoque é obrigatório para produtos de pronta-entrega",
      path: ["stockQuantity"],
    });
  }

  if (data.isEncomenda && (data.preparationTimeDays === undefined || data.preparationTimeDays === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Tempo de preparo é obrigatório para encomendas",
      path: ["preparationTimeDays"],
    });
  }
});

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid("ID de produto inválido"),
});

export const reorderProductItemSchema = z.object({
  id: z.string().uuid(),
  displayOrder: z.number().int().min(0),
});

export const reorderProductsSchema = z.object({
  items: z.array(reorderProductItemSchema),
});

// ============================================================================
// SCHEMAS PARA MODIFICADORES (ADICIONAIS/COMBOS)
// ============================================================================

const modifierGroupBase = z.object({
  productId: z.string().uuid(),
  name: z.string().min(2, "O nome do grupo deve ter no mínimo 2 caracteres"),
  isRequired: z.boolean().default(false),
  minChoices: z.number().int().min(0).default(0),
  maxChoices: z.number().int().min(1).default(1),
  displayOrder: z.number().int().default(0),
});

export const createModifierGroupSchema = modifierGroupBase.refine(data => data.maxChoices >= data.minChoices, {
  message: "O limite máximo não pode ser menor que o mínimo",
  path: ["maxChoices"],
});

export const updateModifierGroupSchema = modifierGroupBase.extend({
  id: z.string().uuid(),
}).omit({ productId: true }).refine(data => data.maxChoices >= data.minChoices, {
  message: "O limite máximo não pode ser menor que o mínimo",
  path: ["maxChoices"],
});

export const createModifierItemSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().min(2, "O nome do item deve ter no mínimo 2 caracteres"),
  additionalPriceCents: z.number().int().min(0).default(0),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateModifierItemSchema = createModifierItemSchema.extend({
  id: z.string().uuid(),
}).omit({ groupId: true }); // GroupId não pode ser alterado após criação
