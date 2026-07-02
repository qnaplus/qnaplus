CREATE TABLE "etag_cache" (
	"resource" text PRIMARY KEY NOT NULL,
	"etag" text NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "etag_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "source" text DEFAULT 'vex' NOT NULL;