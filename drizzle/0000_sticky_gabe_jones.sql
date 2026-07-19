-- Baseline migration. Every statement is idempotent (IF NOT EXISTS / guarded)
-- because production already has these tables from the old hand-written
-- initDb() SQL — this migration must apply cleanly to both a fresh database
-- and the existing one without erroring on "already exists".
CREATE TABLE IF NOT EXISTS "audit_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"result" text,
	"user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_intake_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer,
	"url" text NOT NULL,
	"company_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"goals" text,
	"stack" text,
	"team_size" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_plan_settings" (
	"plan_id" text PRIMARY KEY NOT NULL,
	"ai_provider" text DEFAULT 'openrouter',
	"openrouter_api_key" text DEFAULT '',
	"agentrouter_api_key" text DEFAULT '',
	"nvidia_api_key" text DEFAULT '',
	"allowed_models" text DEFAULT '',
	"price" text DEFAULT '$0'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"subscription_plan" text DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "audit_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'audit_records_user_id_audit_users_id_fk'
	) THEN
		ALTER TABLE "audit_records" ADD CONSTRAINT "audit_records_user_id_audit_users_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."audit_users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END
$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'audit_intake_leads_user_id_audit_users_id_fk'
	) THEN
		ALTER TABLE "audit_intake_leads" ADD CONSTRAINT "audit_intake_leads_user_id_audit_users_id_fk"
			FOREIGN KEY ("user_id") REFERENCES "public"."audit_users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END
$$;
--> statement-breakpoint
-- One-time drift fix: production's audit_plan_settings.allowed_models column may
-- still carry the old default 'google/gemini-2.5-flash' from schema.ts before this
-- migration existed. Align it to '' (the value the SQL seed has always used).
ALTER TABLE "audit_plan_settings" ALTER COLUMN "allowed_models" SET DEFAULT '';
--> statement-breakpoint
INSERT INTO "audit_plan_settings" (plan_id, allowed_models, price)
VALUES
	('free', '', '$0'),
	('pro', 'anthropic/claude-3.5-sonnet,google/gemma-7b-it', '$29'),
	('enterprise', 'anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,meta-llama/llama-3-70b-instruct', '$99')
ON CONFLICT (plan_id) DO NOTHING;
