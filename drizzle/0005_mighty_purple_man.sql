CREATE TYPE "public"."proposal_status" AS ENUM('pending', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TABLE "enrichment_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"field" text NOT NULL,
	"current_value" text,
	"proposed_value" text NOT NULL,
	"rationale" text,
	"value_hash" text NOT NULL,
	"status" "proposal_status" DEFAULT 'pending' NOT NULL,
	"run_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "enrichment_proposals" ADD CONSTRAINT "enrichment_proposals_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrichment_proposals" ADD CONSTRAINT "enrichment_proposals_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrichment_proposals_merchant_idx" ON "enrichment_proposals" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "enrichment_proposals_product_idx" ON "enrichment_proposals" USING btree ("product_id");