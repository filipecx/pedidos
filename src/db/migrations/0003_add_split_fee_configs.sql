ALTER TABLE "stores" ADD COLUMN "transaction_fee_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "pass_fee_to_customer" boolean DEFAULT false NOT NULL;