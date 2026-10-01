import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres"),
  slug: z
    .string()
    .min(3, "O link deve ter pelo menos 3 caracteres")
    .regex(
      /^[a-z0-9-]+$/,
      "O link deve conter apenas letras minúsculas, números e hifens (sem espaços ou acentos)"
    ),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
