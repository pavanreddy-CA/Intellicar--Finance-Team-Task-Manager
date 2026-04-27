import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/recurring-templates
export async function GET() {
  try {
    const sql = getDb();
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Self-Healing Migration: Create table and add new columns ---
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS "RecurringTemplate" (
        id SERIAL PRIMARY KEY,
        "taskNamePattern" TEXT NOT NULL,
        "entityName" TEXT NOT NULL,
        "taskType" TEXT DEFAULT 'External',
        "frequency" TEXT NOT NULL,
        "dayOffset" INTEGER DEFAULT 0,
        "monthOffset" INTEGER DEFAULT 0,
        "defaultOwner" TEXT,
        "defaultReviewer" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "lastGeneratedPeriod" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE "RecurringTemplate" 
      ADD COLUMN IF NOT EXISTS "taskType" TEXT DEFAULT 'External',
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "endDate" DATE,
      ADD COLUMN IF NOT EXISTS "stopDate" DATE,
      ADD COLUMN IF NOT EXISTS "isStopped" BOOLEAN DEFAULT FALSE;
      
      ALTER TABLE "Task"
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT;
    `).catch((err: any) => console.error("Migration check error:", err));
    // ------------------------------------------------------------------

    const templates = await sql`
      SELECT * FROM "RecurringTemplate"
      ORDER BY "createdAt" DESC
    `;
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error("Fetch recurring templates error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/recurring-templates
export async function POST(req: NextRequest) {
  const sql = getDb();
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Ensure Database is ready ---
    await (sql as any).query(`
      CREATE TABLE IF NOT EXISTS "RecurringTemplate" (
        id SERIAL PRIMARY KEY,
        "taskNamePattern" TEXT NOT NULL,
        "entityName" TEXT NOT NULL,
        "taskType" TEXT DEFAULT 'External',
        "frequency" TEXT NOT NULL,
        "dayOffset" INTEGER DEFAULT 0,
        "monthOffset" INTEGER DEFAULT 0,
        "defaultOwner" TEXT,
        "defaultReviewer" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "lastGeneratedPeriod" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE "RecurringTemplate" 
      ADD COLUMN IF NOT EXISTS "taskType" TEXT DEFAULT 'External',
      ADD COLUMN IF NOT EXISTS "departmentName" TEXT DEFAULT 'Finance',
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "endDate" DATE,
      ADD COLUMN IF NOT EXISTS "stopDate" DATE,
      ADD COLUMN IF NOT EXISTS "isStopped" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "weeklyDay" TEXT,
      ADD COLUMN IF NOT EXISTS "excludedDates" JSONB;

      ALTER TABLE "SystemSettings"
      ADD COLUMN IF NOT EXISTS "masterWeekDays" TEXT DEFAULT 'Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday';
    `).catch(() => {});

    const data = await req.json();
    const {
      taskNamePattern,
      entityName,
      taskType,
      departmentName,
      financeFunction,
      frequency,
      dayOffset,
      monthOffset,
      defaultOwner,
      defaultReviewer,
      startDate,
      endDate,
      weeklyDay
    } = data;

    if (!taskNamePattern || !entityName || !taskType || !frequency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO "RecurringTemplate" (
        "taskNamePattern", "entityName", "taskType", "departmentName", "financeFunction",
        "frequency", "dayOffset", "monthOffset", "defaultOwner", "defaultReviewer",
        "startDate", "endDate", "weeklyDay",
        "isActive", "createdAt", "updatedAt"
      )
      VALUES (
        ${taskNamePattern}, ${entityName}, ${taskType}, ${departmentName || "Finance"}, ${financeFunction || null},
        ${frequency}, ${Number(dayOffset) || 0}, ${Number(monthOffset) || 0},
        ${defaultOwner || null}, ${defaultReviewer || null},
        ${startDate ? new Date(startDate) : null}, ${endDate ? new Date(endDate) : null},
        ${weeklyDay || null},
        TRUE, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    console.error("Create recurring template error:", error);
    return NextResponse.json({ 
        error: "Database error during save", 
        details: error.message,
        hint: "Please ensure all mandatory fields are filled."
    }, { status: 500 });
  }
}
