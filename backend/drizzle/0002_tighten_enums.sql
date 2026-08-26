CREATE TYPE "public"."sentiment" AS ENUM('positive', 'negative', 'neutral');--> statement-breakpoint
-- Defensive cleanup: remap any values outside the target enums BEFORE casting,
-- so adoption is safe on a database that accumulated invalid values (e.g. a
-- listening platform of 'twitter' from earlier demo seeding). Without this the
-- ::enum casts below would fail on the first offending row.
UPDATE "chatbot_flows" SET "platform" = 'whatsapp' WHERE "platform" NOT IN ('tiktok','instagram','facebook','whatsapp','sms','phone');--> statement-breakpoint
UPDATE "listening_mentions" SET "platform" = 'instagram' WHERE "platform" NOT IN ('tiktok','instagram','facebook','whatsapp','sms','phone');--> statement-breakpoint
UPDATE "listening_mentions" SET "sentiment" = 'neutral' WHERE "sentiment" NOT IN ('positive','negative','neutral');--> statement-breakpoint
UPDATE "reply_templates" SET "language" = 'en' WHERE "language" NOT IN ('ar','en','ar_en');--> statement-breakpoint
UPDATE "listening_keywords" SET "platforms" = COALESCE((SELECT array_agg(p) FROM unnest("platforms") p WHERE p IN ('tiktok','instagram','facebook','whatsapp','sms','phone')), '{}');--> statement-breakpoint
UPDATE "reply_templates" SET "platforms" = COALESCE((SELECT array_agg(p) FROM unnest("platforms") p WHERE p IN ('tiktok','instagram','facebook','whatsapp','sms','phone')), '{}');--> statement-breakpoint
ALTER TABLE "chatbot_flows" ALTER COLUMN "platform" SET DEFAULT 'whatsapp'::"public"."platform";--> statement-breakpoint
ALTER TABLE "chatbot_flows" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "listening_keywords" ALTER COLUMN "platforms" SET DEFAULT '{}'::platform[]::"public"."platform"[];--> statement-breakpoint
ALTER TABLE "listening_keywords" ALTER COLUMN "platforms" SET DATA TYPE "public"."platform"[] USING "platforms"::"public"."platform"[];--> statement-breakpoint
ALTER TABLE "listening_mentions" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";--> statement-breakpoint
ALTER TABLE "listening_mentions" ALTER COLUMN "sentiment" SET DEFAULT 'neutral'::"public"."sentiment";--> statement-breakpoint
ALTER TABLE "listening_mentions" ALTER COLUMN "sentiment" SET DATA TYPE "public"."sentiment" USING "sentiment"::"public"."sentiment";--> statement-breakpoint
ALTER TABLE "reply_templates" ALTER COLUMN "platforms" SET DEFAULT '{}'::platform[]::"public"."platform"[];--> statement-breakpoint
ALTER TABLE "reply_templates" ALTER COLUMN "platforms" SET DATA TYPE "public"."platform"[] USING "platforms"::"public"."platform"[];--> statement-breakpoint
ALTER TABLE "reply_templates" ALTER COLUMN "language" SET DEFAULT 'en'::"public"."lang";--> statement-breakpoint
ALTER TABLE "reply_templates" ALTER COLUMN "language" SET DATA TYPE "public"."lang" USING "language"::"public"."lang";