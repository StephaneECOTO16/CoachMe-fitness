-- Migration: 20250321000000_uuid_phone
--
-- Converts User.id from SERIAL (integer) to UUID while preserving
-- all existing rows and referential integrity.
--
-- Strategy (must run in this exact order):
--   1. Install pgcrypto extension (provides gen_random_uuid())
--   2. Add new UUID columns alongside existing INT columns
--   3. Backfill UUIDs for every existing User row
--   4. Add UUID FKs on all tables that reference User.id
--   5. Backfill the UUID FK columns from the mapping
--   6. Drop old INT FK columns and constraints
--   7. Drop old User.id INT column, promote UUID column to primary key
--   8. Add phone column to User
--   9. Add missing indexes
--
-- NOTE: Runs in a single transaction. If any step fails the entire
-- migration rolls back — no partial state.

BEGIN;

-- ─── Step 1: Extension ───────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Step 2: Add new UUID column to User (nullable, no PK yet) ───────────────

ALTER TABLE "User" ADD COLUMN "uuid_id" UUID DEFAULT gen_random_uuid();

-- ─── Step 3: Backfill — every existing row gets a UUID ───────────────────────

UPDATE "User" SET "uuid_id" = gen_random_uuid() WHERE "uuid_id" IS NULL;

-- Make it non-nullable now that all rows are filled
ALTER TABLE "User" ALTER COLUMN "uuid_id" SET NOT NULL;

-- ─── Step 4: Add UUID FK columns to all tables referencing User.id ───────────

-- CoachProfile.userId
ALTER TABLE "CoachProfile" ADD COLUMN "user_uuid" UUID;

-- ClientProfile.userId
ALTER TABLE "ClientProfile" ADD COLUMN "user_uuid" UUID;

-- Media.ownerId
ALTER TABLE "Media" ADD COLUMN "owner_uuid" UUID;

-- Message.senderId
ALTER TABLE "Message" ADD COLUMN "sender_uuid" UUID;

-- AdminReview.adminId
ALTER TABLE "AdminReview" ADD COLUMN "admin_uuid" UUID;

-- PasswordResetToken.userId
ALTER TABLE "PasswordResetToken" ADD COLUMN "user_uuid" UUID;

-- ─── Step 5: Backfill UUID FKs using the mapping in User ─────────────────────

-- CoachProfile
UPDATE "CoachProfile" cp
SET "user_uuid" = u."uuid_id"
FROM "User" u
WHERE cp."userId" = u."id";

-- ClientProfile
UPDATE "ClientProfile" cp
SET "user_uuid" = u."uuid_id"
FROM "User" u
WHERE cp."userId" = u."id";

-- Media (ownerId is nullable)
UPDATE "Media" m
SET "owner_uuid" = u."uuid_id"
FROM "User" u
WHERE m."ownerId" = u."id";

-- Message
UPDATE "Message" msg
SET "sender_uuid" = u."uuid_id"
FROM "User" u
WHERE msg."senderId" = u."id";

-- AdminReview
UPDATE "AdminReview" ar
SET "admin_uuid" = u."uuid_id"
FROM "User" u
WHERE ar."adminId" = u."id";

-- PasswordResetToken
UPDATE "PasswordResetToken" prt
SET "user_uuid" = u."uuid_id"
FROM "User" u
WHERE prt."userId" = u."id";

-- ─── Step 6: Drop old FK constraints ─────────────────────────────────────────

-- CoachProfile
ALTER TABLE "CoachProfile" DROP CONSTRAINT "CoachProfile_userId_fkey";
ALTER TABLE "CoachProfile" DROP COLUMN "userId";
ALTER TABLE "CoachProfile" RENAME COLUMN "user_uuid" TO "userId";
ALTER TABLE "CoachProfile" ALTER COLUMN "userId" SET NOT NULL;

-- ClientProfile
ALTER TABLE "ClientProfile" DROP CONSTRAINT "ClientProfile_userId_fkey";
ALTER TABLE "ClientProfile" DROP COLUMN "userId";
ALTER TABLE "ClientProfile" RENAME COLUMN "user_uuid" TO "userId";
ALTER TABLE "ClientProfile" ALTER COLUMN "userId" SET NOT NULL;

-- Media (ownerId nullable, no NOT NULL)
ALTER TABLE "Media" DROP CONSTRAINT "Media_ownerId_fkey";
ALTER TABLE "Media" DROP COLUMN "ownerId";
ALTER TABLE "Media" RENAME COLUMN "owner_uuid" TO "ownerId";

-- Message
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";
ALTER TABLE "Message" DROP COLUMN "senderId";
ALTER TABLE "Message" RENAME COLUMN "sender_uuid" TO "senderId";
ALTER TABLE "Message" ALTER COLUMN "senderId" SET NOT NULL;

-- AdminReview
ALTER TABLE "AdminReview" DROP CONSTRAINT "AdminReview_adminId_fkey";
ALTER TABLE "AdminReview" DROP COLUMN "adminId";
ALTER TABLE "AdminReview" RENAME COLUMN "admin_uuid" TO "adminId";
ALTER TABLE "AdminReview" ALTER COLUMN "adminId" SET NOT NULL;

-- PasswordResetToken
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";
ALTER TABLE "PasswordResetToken" DROP COLUMN "userId";
ALTER TABLE "PasswordResetToken" RENAME COLUMN "user_uuid" TO "userId";
ALTER TABLE "PasswordResetToken" ALTER COLUMN "userId" SET NOT NULL;

-- ─── Step 7: Promote User.uuid_id to primary key ─────────────────────────────

-- Drop old primary key and sequence
ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "uuid_id" TO "id";
ALTER TABLE "User" ADD PRIMARY KEY ("id");

-- ─── Step 8: Re-add foreign key constraints with new UUID type ────────────────

ALTER TABLE "CoachProfile"
  ADD CONSTRAINT "CoachProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientProfile"
  ADD CONSTRAINT "ClientProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Media"
  ADD CONSTRAINT "Media_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminReview"
  ADD CONSTRAINT "AdminReview_adminId_fkey"
  FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Step 9: Phone number + new indexes ──────────────────────────────────────

-- Add phone number column to User (nullable — existing users won't have one)
ALTER TABLE "User" ADD COLUMN "phone" VARCHAR(20);

-- Performance indexes identified in the audit
CREATE INDEX IF NOT EXISTS "CoachProfile_status_idx" ON "CoachProfile"("status");
CREATE INDEX IF NOT EXISTS "CoachProfile_status_createdAt_idx" ON "CoachProfile"("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Media_coachId_type_idx" ON "Media"("coachId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "Chat_coachId_clientId_key" ON "Chat"("coachId", "clientId");

COMMIT;
