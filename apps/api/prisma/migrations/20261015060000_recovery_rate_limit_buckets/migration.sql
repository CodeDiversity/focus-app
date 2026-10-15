-- CreateTable: SP-105F shared per-IP recovery rate-limit buckets (SD8).
-- Additive; SQL is the verbatim `prisma migrate diff --from-schema --to-schema`
-- output for the `RecoveryRateLimitBucket` model.

-- CreateTable
CREATE TABLE "recovery_rate_limit_buckets" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "normalizedIp" TEXT NOT NULL,
    "admittedAt" TIMESTAMP(3)[] DEFAULT ARRAY[]::TIMESTAMP(3)[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recovery_rate_limit_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_rate_limit_buckets_endpoint_normalizedIp_key" ON "recovery_rate_limit_buckets"("endpoint", "normalizedIp");
