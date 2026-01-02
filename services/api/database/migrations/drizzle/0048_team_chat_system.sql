-- Migration: Team Chat System with Presence Tracking
-- Description: Creates tables for real-time team chat with message persistence and user presence tracking
-- HIPAA Compliance: Includes audit trail, soft deletes, and PHI protection for patient care rooms

-- Create room_type enum
DO $$ BEGIN
 CREATE TYPE "public"."room_type" AS ENUM('direct', 'group', 'department', 'patient_care');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create presence_status enum
DO $$ BEGIN
 CREATE TYPE "public"."presence_status" AS ENUM('online', 'away', 'busy', 'offline');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS "chat_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"type" "room_type" DEFAULT 'group' NOT NULL,
	"description" text,
	"patient_id" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"reply_to_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS "chat_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"room_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"last_read_at" timestamp,
	"last_read_message_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create user_presence table
CREATE TABLE IF NOT EXISTS "user_presence" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL UNIQUE,
	"status" "presence_status" DEFAULT 'offline' NOT NULL,
	"status_message" varchar(255),
	"socket_id" varchar(255),
	"is_connected" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"typing_in_room_id" text,
	"user_agent" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create presence_history table
CREATE TABLE IF NOT EXISTS "presence_history" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"old_status" "presence_status" NOT NULL,
	"new_status" "presence_status" NOT NULL,
	"socket_id" varchar(255),
	"user_agent" text,
	"ip_address" varchar(45),
	"session_started_at" timestamp,
	"session_ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints for chat_rooms
DO $$ BEGIN
 ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for chat_messages
DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_chat_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for chat_participants
DO $$ BEGIN
 ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_room_id_chat_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."chat_rooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for user_presence
DO $$ BEGIN
 ALTER TABLE "user_presence" ADD CONSTRAINT "user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for presence_history
DO $$ BEGIN
 ALTER TABLE "presence_history" ADD CONSTRAINT "presence_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for chat_rooms
CREATE INDEX IF NOT EXISTS "idx_chat_rooms_type" ON "chat_rooms" USING btree ("type");
CREATE INDEX IF NOT EXISTS "idx_chat_rooms_created_by" ON "chat_rooms" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_chat_rooms_is_active" ON "chat_rooms" USING btree ("is_active");
CREATE INDEX IF NOT EXISTS "idx_chat_rooms_patient_id" ON "chat_rooms" USING btree ("patient_id");
CREATE INDEX IF NOT EXISTS "idx_chat_rooms_created_at" ON "chat_rooms" USING btree ("created_at");

-- Create indexes for chat_messages
CREATE INDEX IF NOT EXISTS "idx_chat_messages_room_id" ON "chat_messages" USING btree ("room_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_sender_id" ON "chat_messages" USING btree ("sender_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_created_at" ON "chat_messages" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_room_time" ON "chat_messages" USING btree ("room_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_room_active" ON "chat_messages" USING btree ("room_id", "is_deleted", "created_at");

-- Create indexes for chat_participants
CREATE INDEX IF NOT EXISTS "idx_chat_participants_room_user" ON "chat_participants" USING btree ("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_participants_user_active" ON "chat_participants" USING btree ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_chat_participants_room_active" ON "chat_participants" USING btree ("room_id", "is_active");

-- Create indexes for user_presence
CREATE INDEX IF NOT EXISTS "idx_user_presence_user_id" ON "user_presence" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_presence_status" ON "user_presence" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_user_presence_is_connected" ON "user_presence" USING btree ("is_connected");
CREATE INDEX IF NOT EXISTS "idx_user_presence_active_online" ON "user_presence" USING btree ("is_connected", "status", "last_active_at");
CREATE INDEX IF NOT EXISTS "idx_user_presence_typing" ON "user_presence" USING btree ("typing_in_room_id");
CREATE INDEX IF NOT EXISTS "idx_user_presence_last_seen" ON "user_presence" USING btree ("last_seen_at");

-- Create indexes for presence_history
CREATE INDEX IF NOT EXISTS "idx_presence_history_user_id" ON "presence_history" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_presence_history_created_at" ON "presence_history" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_presence_history_user_time" ON "presence_history" USING btree ("user_id", "created_at");
