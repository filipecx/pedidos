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

export const updateCustomizationSchema = z.object({
  colorPrimary: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida").optional(),
  colorBackground: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida").optional(),
  colorText: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Cor inválida").optional(),
  productView: z.enum(['list', 'grid']).optional(),
  categoryPosition: z.enum(['top', 'sidebar']).optional(),
  bannerUrl: z.string().url("URL de banner inválida").optional().or(z.literal("")),
  profileUrl: z.string().url("URL de perfil inválida").optional().or(z.literal("")),
});
