import { z } from "zod";

export const createProductSchema = z.object({
  categoryId: z.string().uuid("ID da categoria inválido"),
  name: z.string().min(2, "O nome do produto deve ter no mínimo 2 caracteres"),
  description: z.string().optional(),
  basePriceCents: z.number().int().min(0, "O preço não pode ser negativo"),
  imageUrl: z.string().url("URL de imagem inválida").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
  
  type: z.enum(["PRONTA_ENTREGA", "ENCOMENDA"]),
  stockQuantity: z.number().int().min(0).optional().nullable(),
  preparationTimeDays: z.number().int().min(1).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === "PRONTA_ENTREGA" && (data.stockQuantity === undefined || data.stockQuantity === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Estoque é obrigatório para produtos de pronta-entrega",
      path: ["stockQuantity"],
    });
  }

  if (data.type === "ENCOMENDA" && (data.preparationTimeDays === undefined || data.preparationTimeDays === null)) {
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
