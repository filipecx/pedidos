import { z } from 'zod';

export const updateStoreFeeSchema = z.object({
  storeId: z.string().uuid(),
  transactionFeeCents: z.number().int().min(0),
  passFeeToCustomer: z.boolean(),
});

export const toggleStoreStatusSchema = z.object({
  storeId: z.string().uuid(),
  isActive: z.boolean(),
});

export type UpdateStoreFeeInput = z.infer<typeof updateStoreFeeSchema>;
export type ToggleStoreStatusInput = z.infer<typeof toggleStoreStatusSchema>;
