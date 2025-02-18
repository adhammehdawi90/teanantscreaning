CREATE TABLE "assessment_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"candidate_id" integer NOT NULL,
	"candidate_name" text NOT NULL,
	"submitted_at" text NOT NULL,
	"answers" jsonb NOT NULL,
	"evaluations" jsonb NOT NULL,
	"total_score" integer NOT NULL,
	"screen_recording_url" text,
	"webcam_recording_url" text
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" integer NOT NULL,
	"requires_recording" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'candidate' NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "video_interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text,
	"candidate_id" integer NOT NULL,
	"assessment_id" integer NOT NULL
);
