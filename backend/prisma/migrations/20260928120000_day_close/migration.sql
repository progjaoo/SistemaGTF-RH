-- CreateTable DayClose.
-- Padrao do repo: "id" UUID NOT NULL sem DEFAULT no banco
-- (uuid gerado client-side via @default(uuid()); ver 20260618120000_init).
CREATE TABLE "DayClose" (
  "id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "periodId" UUID NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedById" UUID,
  CONSTRAINT "DayClose_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DayClose_date_key" ON "DayClose"("date");
CREATE INDEX "DayClose_periodId_idx" ON "DayClose"("periodId");
ALTER TABLE "DayClose" ADD CONSTRAINT "DayClose_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "BillingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DayClose" ADD CONSTRAINT "DayClose_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
