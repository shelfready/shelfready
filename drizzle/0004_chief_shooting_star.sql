ALTER TABLE "merchants" ADD COLUMN "feed_token" text;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_feed_token_unique" UNIQUE("feed_token");