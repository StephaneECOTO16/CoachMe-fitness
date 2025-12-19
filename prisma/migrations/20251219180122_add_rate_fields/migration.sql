/*
  Warnings:

  - You are about to drop the column `hourlyRate` on the `CoachProfile` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('HOUR', 'WEEK', 'MONTH');

-- AlterTable
ALTER TABLE "CoachProfile" DROP COLUMN "hourlyRate",
ADD COLUMN     "rateAmount" DECIMAL(10,2),
ADD COLUMN     "rateType" "RateType" NOT NULL DEFAULT 'HOUR';
