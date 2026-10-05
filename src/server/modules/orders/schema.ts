import { z } from "zod";

export const checkoutSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  customerPhone: z.string().min(10, "Telefone inválido"),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  cartType: z.enum(["pronta_entrega", "encomenda"]),
  scheduledTime: z.string().optional(), // Necessário se for encomenda
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().min(1),
  })).min(1, "Carrinho vazio"),
}).superRefine((data, ctx) => {
  if (data.cartType === "encomenda" && !data.scheduledTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Data e hora de retirada/entrega são obrigatórios para encomendas",
      path: ["scheduledTime"],
    });
  }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
