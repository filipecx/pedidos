import { z } from "zod";

/**
 * Schema Zod para o payload de alteração de status da loja pelo Agente de IA.
 * 
 * Como o agente executa no contexto do lojista logado (sessão via cookies),
 * o storeId/userId é extraído automaticamente da sessão.
 * 
 * Aceita:
 * - status: 'OPEN' | 'CLOSED' | 'AUTO'
 * - ou isOpen: boolean | null (para compatibilidade direta)
 */
export const agentStoreStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "AUTO"]).optional(),
  isOpen: z.boolean().nullable().optional(),
}).refine(
  (data) => data.status !== undefined || data.isOpen !== undefined,
  {
    message: "É necessário fornecer 'status' ('OPEN' | 'CLOSED' | 'AUTO') ou 'isOpen' (true | false | null).",
  }
);

export type AgentStoreStatusInput = z.infer<typeof agentStoreStatusSchema>;
