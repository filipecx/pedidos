CREATE TYPE "public"."plan_type" AS ENUM('PERCENTAGE', 'MONTHLY');--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"banner_url" text,
	"profile_url" text,
	"pix_key" text,
	"business_hours" jsonb,
	"plan_type" "plan_type" DEFAULT 'PERCENTAGE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;