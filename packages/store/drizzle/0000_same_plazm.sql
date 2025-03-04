CREATE TABLE "answer_queue" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "failures" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"id" integer PRIMARY KEY NOT NULL,
	"currentSeason" text NOT NULL,
	"oldestUnansweredQuestion" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"program" text NOT NULL,
	"season" text NOT NULL,
	"author" text NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"questionRaw" text NOT NULL,
	"answer" text,
	"answerRaw" text,
	"askedTimestamp" text NOT NULL,
	"askedTimestampMs" bigint NOT NULL,
	"answeredTimestamp" text DEFAULT NULL,
	"answeredTimestampMs" bigint,
	"answered" boolean NOT NULL,
	"tags" text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "renotify_queue" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_queue" ADD CONSTRAINT "answer_queue_id_questions_id_fk" FOREIGN KEY ("id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "renotify_queue" ADD CONSTRAINT "renotify_queue_id_questions_id_fk" FOREIGN KEY ("id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;