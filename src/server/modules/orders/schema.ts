import { z } from "zod";

export const deliveryAddressSchema = z.object({
  street: z.string().min(2, "Rua/Avenida é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  complement: z.string().optional(),
  reference: z.string().optional(),
});

export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;

export const checkoutSchema = z.object({
  storeId: z.string().uuid(),
  customerName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  customerPhone: z.string()
    .transform((val) => val.replace(/\D/g, ""))
    .refine((digits) => digits.length === 10 || digits.length === 11, {
      message: "Telefone deve conter DDD + número (10 ou 11 dígitos)",
    })
    .refine((digits) => /^[1-9]{2}[2-9][0-9]{7,8}$/.test(digits), {
      message: "DDD ou número de telefone inválido no padrão brasileiro",
    }),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  deliveryAddress: deliveryAddressSchema.optional(),
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

  if (data.deliveryMethod === "DELIVERY" && !data.deliveryAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Endereço completo é obrigatório para entrega",
      path: ["deliveryAddress"],
    });
  }
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
