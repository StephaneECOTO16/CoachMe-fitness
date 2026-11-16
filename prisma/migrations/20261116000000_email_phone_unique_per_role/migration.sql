-- Email and phone are no longer globally unique: the same person may hold
-- one account per role (e.g. a client account AND a coach account with the
-- same email / phone). Uniqueness is now enforced per (value, role).
--
-- Safe on existing data: rows that were unique on email alone are also
-- unique on (email, role). NULL phones never conflict in PostgreSQL.
-- IF EXISTS guards against environments where the old index drifted.

-- DropIndex
DROP INDEX IF EXISTS "User_email_key";

-- DropIndex
DROP INDEX IF EXISTS "User_phone_key";

-- CreateIndex
CREATE UNIQUE INDEX "User_email_role_key" ON "User"("email", "role");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_role_key" ON "User"("phone", "role");
