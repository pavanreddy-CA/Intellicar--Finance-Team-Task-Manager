import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { resolveTaskName, getPeriodKey } from "@/lib/recurringUtils";
import { getEmailFromName, sendEmail } from "@/lib/email";
import { triggerNotification } from "@/services/notificationService";

export const dynamic = 'force-dynamic';

async function handleDailyTasks(req: NextRequest) {
  try {
    const sql = getDb();
    
    // Auth Check matching daily-summary
    const authHeader = req.headers.get("authorization");
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    const isManualToken = authHeader === "Bearer intellicar-cron-123";
    const isManualTrigger = req.headers.get("x-manual-trigger") === "true";
    
    if (process.env.NODE_ENV === "production" && !isVercelCron && !isManualToken && !isManualTrigger) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const isManual = isManualTrigger || isManualToken;
    
    // 1. Fetch System Settings for Holidays and Time
    const settingsResult = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;
    const settings = settingsResult[0] || {};
    const holidayList = JSON.parse(settings.holidayList || "[]");
    const generationTime = settings.dailyTaskGenerationTime || "06:00";

    // --- Watertight Duplicate Prevention Migration ---
    try {
      // Ensure columns exist (if not already added by other routes)
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "templateId" INTEGER`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "periodKey" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "financeFunction" TEXT`;
      
      // Create Unique Index to physically prevent duplicates at DB level
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS "task_template_period_idx" ON "Task" ("templateId", "periodKey")`;
    } catch (migErr) {
      console.log("Migration (Unique Index) note:", migErr);
    }
    // -------------------------------------------------
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // 2. Weekend & Holiday Check
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidayList.includes(todayStr);
    
    if (!isManual) {
      if (isWeekend || isHoliday) {
        return NextResponse.json({ message: "Skipping generation: Weekend or Holiday" });
      }
      
      // Time check (only if not manual)
      const [genHour, genMin] = generationTime.split(':').map(Number);
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      
      if (currentHour < genHour || (currentHour === genHour && currentMin < genMin)) {
        return NextResponse.json({ message: "Too early for generation" });
      }

      // Already generated today?
      if (settings.lastDailyGenerationAt) {
        const lastGen = new Date(settings.lastDailyGenerationAt).toISOString().split('T')[0];
        if (lastGen === todayStr) {
          return NextResponse.json({ message: "Already generated for today" });
        }
      }
    }

    // 3. Fetch Active Daily Templates
    const templates = await sql`
      SELECT * FROM "RecurringTemplate" 
      WHERE "frequency" = 'D' AND "isActive" = TRUE AND "isStopped" = FALSE
    `;

    const results = [];
    const errors = [];

    // 4. Generate Tasks
    for (const template of templates) {
      try {
        const periodKey = getPeriodKey('D', now);
        const taskName = resolveTaskName(template.taskNamePattern, now);
        
        // Duplicate Check
        const existing = await sql`
          SELECT id FROM "Task" 
          WHERE "templateId" = ${template.id} 
          AND "periodKey" = ${periodKey}
          LIMIT 1
        `;

        if (existing.length > 0) continue;

        // Display ID Generation
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const yearStr = String(now.getFullYear()).slice(-2);
        const prefix = `${monthStr}${yearStr}`;
        
        const sequences = await sql`
          INSERT INTO "TaskSequence" ("monthYear", "nextVal")
          VALUES (${prefix}, 1)
          ON CONFLICT ("monthYear")
          DO UPDATE SET "nextVal" = "TaskSequence"."nextVal" + 1
          RETURNING "nextVal"
        `;
        const nextVal = sequences[0].nextVal;
        const displayId = `T-${prefix}-${String(nextVal).padStart(2, '0')}`;

        const resolvedReviewer = template.defaultReviewer || "Not Applicable";
        const reviewStatus = resolvedReviewer === "Not Applicable" ? "Review Not Required" : "Task Pending From Owner";

        const newTasks = await sql`
          INSERT INTO "Task" (
            "taskName", "entityName", "taskType", "departmentName", "financeFunction", "requestFrom",
            "ownerName", "reviewerName", "dueDate", "taskStatus", "reviewStatus",
            "templateId", "periodKey", "frequency", "displayId", "source", "isApproved", "createdByEmail", "createdAt", "updatedAt"
          )
          VALUES (
            ${taskName}, ${template.entityName}, ${template.taskType}, ${template.departmentName || 'Finance'}, 
            ${template.financeFunction || null}, 'System (Auto-Daily)',
            ${template.defaultOwner}, ${resolvedReviewer}, ${now.toISOString()},
            'Pending', ${reviewStatus},
            ${template.id}, ${periodKey}, 'Daily', ${displayId}, 'RA', TRUE, 'System', NOW(), NOW()
          )
          ON CONFLICT ("templateId", "periodKey") DO NOTHING
          RETURNING *
        `;

        if (newTasks.length > 0) {
          results.push(newTasks[0]);
          // Trigger Notification (Wait for it)
          await triggerNotification('TASK_ASSIGNED', newTasks[0]);
        }

      } catch (err: any) {
        errors.push({ templateId: template.id, error: err.message });
      }
    }

    // 5. Update Last Generation Timestamp
    await sql`
      UPDATE "SystemSettings" 
      SET "lastDailyGenerationAt" = NOW()
      WHERE id = 'singleton'
    `;

    return NextResponse.json({ 
      success: true, 
      count: results.length, 
      errors: errors.length > 0 ? errors : undefined 
    });

  } catch (error: any) {
    console.error("Cron daily tasks error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleDailyTasks(req);
}

export async function POST(req: NextRequest) {
  return handleDailyTasks(req);
}
