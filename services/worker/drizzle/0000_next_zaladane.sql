CREATE TABLE `answer_queue` (
	`id` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `failures` (
	`id` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`currentSeason` text NOT NULL,
	`oldestUnansweredQuestion` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`program` text NOT NULL,
	`season` text NOT NULL,
	`author` text NOT NULL,
	`title` text NOT NULL,
	`question` text NOT NULL,
	`questionRaw` text NOT NULL,
	`answer` text,
	`answerRaw` text,
	`askedTimestamp` text NOT NULL,
	`askedTimestampMs` integer NOT NULL,
	`answeredTimestamp` text DEFAULT NULL,
	`answeredTimestampMs` integer,
	`answered` integer NOT NULL,
	`tags` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `renotify_queue` (
	`id` text PRIMARY KEY NOT NULL,
	FOREIGN KEY (`id`) REFERENCES `questions`(`id`) ON UPDATE no action ON DELETE cascade
);
