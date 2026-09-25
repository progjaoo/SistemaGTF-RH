-- Alter MealRecord.registeredById to nullable so the employee portal can
-- create self check-in records without an RH/gestor user as author.
ALTER TABLE "MealRecord" ALTER COLUMN "registeredById" DROP NOT NULL;
