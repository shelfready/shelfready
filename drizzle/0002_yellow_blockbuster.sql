CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "merchants" ADD COLUMN "stripe_customer_id" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_stripe_customer_id_unique" UNIQUE("stripe_customer_id");