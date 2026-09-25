-- CreateTable PushSubscription (PLAN-006 Task 1).
-- Padrao do repo: "id" UUID NOT NULL sem DEFAULT no banco
-- (uuid gerado client-side via @default(uuid()); ver 20260618120000_init).
CREATE TABLE "PushSubscription" (
  "id" UUID NOT NULL,
  "employeeId" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_employeeId_idx" ON "PushSubscription"("employeeId");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
