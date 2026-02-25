CREATE TABLE IF NOT EXISTS "state_waitlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_info" text NOT NULL,
	"state_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
