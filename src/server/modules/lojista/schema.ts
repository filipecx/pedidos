import { z } from "zod";

export const registerLojistaSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido").optional(),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export type RegisterLojistaInput = z.infer<typeof registerLojistaSchema>;
