-- Restores unique constraints that schema.prisma has always declared but
-- that never existed (User.phone) or were silently dropped by the
-- 20251213000000_uuid_phone migration when it replaced the INT userId
-- columns with UUID ones (DROP COLUMN also drops any index on that
-- column; the migration never recreated the unique index afterwards).
-- Verified beforehand: no duplicate values block these on the current data.

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_userId_key" ON "CoachProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
