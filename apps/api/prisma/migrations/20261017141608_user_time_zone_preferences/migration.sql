-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferences" JSONB,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC';
