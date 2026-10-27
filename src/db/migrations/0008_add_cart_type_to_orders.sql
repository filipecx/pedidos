CREATE TYPE "public"."cart_type" AS ENUM('pronta_entrega', 'encomenda');--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "orders_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "total_sales_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "cart_type" "cart_type" DEFAULT 'pronta_entrega' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "scheduled_time" timestamp with time zone;