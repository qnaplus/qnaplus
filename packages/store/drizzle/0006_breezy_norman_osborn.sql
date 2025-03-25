CREATE TABLE "event_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_queue" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "answer_queue" CASCADE;--> statement-breakpoint
DROP TABLE "renotify_queue" CASCADE;--> statement-breakpoint
ALTER TABLE "programs" RENAME TO "forum_state";