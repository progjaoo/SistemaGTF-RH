CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('RH', 'GESTORA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduleType" AS ENUM ('MON_FRI', 'MON_SUN', 'CUSTOM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BillingStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "passwordHash" text NOT NULL,
  "role" "Role" NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Employee" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "scheduleType" "ScheduleType" NOT NULL DEFAULT 'MON_FRI',
  "admissionDate" date,
  "terminationDate" date,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MealPrice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "value" numeric(10, 2) NOT NULL,
  "validFrom" date NOT NULL,
  "validTo" date,
  "employeeId" uuid REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdById" uuid REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BillingPeriod" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "label" text NOT NULL,
  "startDate" date NOT NULL,
  "endDate" date NOT NULL,
  "status" "BillingStatus" NOT NULL DEFAULT 'OPEN',
  "closedAt" timestamp(3),
  "closedById" uuid REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "totalAmount" numeric(10, 2),
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MealRecord" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" uuid NOT NULL REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "periodId" uuid NOT NULL REFERENCES "BillingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "date" date NOT NULL,
  "quantity" integer NOT NULL DEFAULT 1,
  "registeredById" uuid NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MealRecord_employeeId_date_key" UNIQUE ("employeeId", "date")
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" uuid REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "entity" text NOT NULL,
  "entityId" text,
  "action" text NOT NULL,
  "metadata" jsonb,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");
CREATE INDEX IF NOT EXISTS "Employee_name_idx" ON "Employee"("name");
CREATE INDEX IF NOT EXISTS "MealPrice_employeeId_validFrom_idx" ON "MealPrice"("employeeId", "validFrom");
CREATE INDEX IF NOT EXISTS "BillingPeriod_status_idx" ON "BillingPeriod"("status");
CREATE INDEX IF NOT EXISTS "BillingPeriod_startDate_endDate_idx" ON "BillingPeriod"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "MealRecord_periodId_date_idx" ON "MealRecord"("periodId", "date");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
