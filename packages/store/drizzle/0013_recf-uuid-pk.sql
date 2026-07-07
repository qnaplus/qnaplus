CREATE TABLE "recf_metadata" (
	"program" text PRIMARY KEY NOT NULL,
	"start" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recf_metadata" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" DROP CONSTRAINT "questions_pkey";--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_program_id_unique" UNIQUE("program","id");
