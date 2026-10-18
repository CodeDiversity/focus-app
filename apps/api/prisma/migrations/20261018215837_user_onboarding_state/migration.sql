-- AlterTable
ALTER TABLE "users" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingSemesterId" TEXT,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 1;

-- SP-107A (D107-2): backfill existing users as completed — they skip the wizard.
UPDATE "users" SET "onboardingCompletedAt" = now() WHERE "onboardingCompletedAt" IS NULL;
