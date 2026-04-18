-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "layout" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3);
