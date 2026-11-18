-- Sessions issued before the last password change are rejected (logs out other devices).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
