-- Align User.phone with the Prisma schema (`String?` → TEXT).
-- The column was created as VARCHAR(20) in 20251213000000_uuid_phone, which
-- is too short for the reversible "deleted:<userId>:<phone>" value used to
-- release a phone number of an admin-deleted account (see
-- src/lib/archived-identifiers.ts). VARCHAR → TEXT is binary-coercible in
-- PostgreSQL: no table rewrite and the unique index is kept as-is.
ALTER TABLE "User" ALTER COLUMN "phone" TYPE TEXT;
