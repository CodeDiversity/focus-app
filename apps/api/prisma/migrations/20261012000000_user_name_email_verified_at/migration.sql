-- AlterTable
-- Replaces firstName/lastName with a single required display name and
-- isVerified with a nullable emailVerifiedAt timestamp (verification is SP-103).
ALTER TABLE "users" DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "isVerified",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);
