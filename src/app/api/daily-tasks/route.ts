import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";

// GET /api/daily-tasks?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Date range required" }, { status: 400 });
    }

    const sql = getDb();

    // --- Migration ---
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS "DailyTaskCompletion" (
          id SERIAL PRIMARY KEY,
          "templateId" INTEGER NOT NULL,
          "taskDate" DATE NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'Not Completed',
          "completedAt" TIMESTAMP WITH TIME ZONE,
          "completedBy" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE("templateId", "taskDate")
        );
      `;
    } catch (err) {
      console.error("Migration error in DailyTaskCompletion:", err);
    }

    const results = await sql`
      SELECT * FROM "DailyTaskCompletion"
      WHERE "taskDate" >= ${from} AND "taskDate" <= ${to}
    `;

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Fetch daily tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/daily-tasks
// Body: { tasks: [{ templateId, taskDate, status }] }
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tasks } = await req.json();
    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const sql = getDb();
    const userName = session.user?.name || "System";

    const savedResults = [];

    for (const task of tasks) {
      const { templateId, taskDate, status } = task;
      
      const result = await sql`
        INSERT INTO "DailyTaskCompletion" (
          "templateId", "taskDate", "status", "completedAt", "completedBy", "updatedAt"
        )
        VALUES (
          ${templateId}, ${taskDate}, ${status}, 
          ${status === 'Completed' ? new Date() : null}, 
          ${status === 'Completed' ? userName : null}, 
          NOW()
        )
        ON CONFLICT ("templateId", "taskDate") 
        DO UPDATE SET 
          "status" = EXCLUDED."status",
          "completedAt" = EXCLUDED."completedAt",
          "completedBy" = EXCLUDED."completedBy",
          "updatedAt" = NOW()
        RETURNING *
      `;
      savedResults.push(result[0]);
    }

    return NextResponse.json({ message: "Daily tasks updated", results: savedResults });
  } catch (error: any) {
    console.error("Save daily tasks error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
