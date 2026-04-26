-- Create RecurringTemplate table for recurring task automation
CREATE TABLE IF NOT EXISTS "RecurringTemplate" (
  "id" SERIAL PRIMARY KEY,
  "taskNamePattern" TEXT NOT NULL,
  "entityName" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "departmentName" TEXT DEFAULT 'Finance',
  "frequency" TEXT NOT NULL CHECK ("frequency" IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY')),
  "dayOffset" INTEGER DEFAULT 1,
  "monthOffset" INTEGER DEFAULT 0,
  "defaultOwner" TEXT,
  "defaultReviewer" TEXT,
  "isActive" BOOLEAN DEFAULT TRUE,
  "lastGeneratedPeriod" TEXT,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_recurring_template_active" ON "RecurringTemplate" ("isActive");
CREATE INDEX IF NOT EXISTS "idx_recurring_template_frequency" ON "RecurringTemplate" ("frequency");
