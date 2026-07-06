-- CreateEnum
CREATE TYPE "ConfirmationStatus" AS ENUM ('PENDING', 'PEGUEI', 'NAO_PEGUEI');

-- CreateEnum
CREATE TYPE "ConfirmationSource" AS ENUM ('SISTEMA', 'WHATSAPP');

-- AlterTable
ALTER TABLE "MealRecord"
ADD COLUMN "confirmationStatus" "ConfirmationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "confirmationSource" "ConfirmationSource",
ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MealRecord_confirmationStatus_idx" ON "MealRecord"("confirmationStatus");
