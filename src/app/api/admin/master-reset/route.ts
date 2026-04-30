import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    const session = await getServerSession();
    
    // Security Check: Only Admin can reset
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized. Admin access required." }, { status: 401 });
    }

    const { action } = await req.json();

    if (action === "RESET") {
      // 1. Take Snapshot of current state
      const tasks = await sql`SELECT * FROM "Task"`;
      const los = await sql`SELECT * FROM "LearningOpportunity"`;
      const extReqs = await sql`SELECT * FROM "ExternalRequest"`;
      const sequences = await sql`SELECT * FROM "TaskSequence"`;
      
      let recurringTasks: any[] = [];
      try {
        recurringTasks = await sql`SELECT * FROM "RecurringTask"`;
      } catch (e) {}

      const snapshot = {
        tasks,
        los,
        extReqs,
        sequences,
        recurringTasks,
        resetAt: new Date().toISOString(),
        resetBy: session.user?.email
      };

      // 2. Save to DataBackup
      await sql`CREATE TABLE IF NOT EXISTS "DataBackup" ("id" TEXT PRIMARY KEY, "snapshot" JSONB, "createdAt" TIMESTAMP DEFAULT NOW())`;
      const backupId = `backup_${Date.now()}`;
      await sql`
        INSERT INTO "DataBackup" ("id", "snapshot", "createdAt")
        VALUES (${backupId}, ${JSON.stringify(snapshot)}, NOW())
      `;

      // 3. Purge operational tables
      await sql`DELETE FROM "Task"`;
      await sql`DELETE FROM "LearningOpportunity"`;
      await sql`DELETE FROM "ExternalRequest"`;
      await sql`DELETE FROM "TaskSequence"`;
      try {
        await sql`DELETE FROM "RecurringTask"`;
      } catch (e) {}

      return NextResponse.json({ 
        message: "Master Reset successful. All transactions cleared. Snapshot saved.",
        backupId 
      });
    }

    if (action === "REVERSE") {
      // 1. Fetch latest backup
      const backups = await sql`SELECT * FROM "DataBackup" ORDER BY "createdAt" DESC LIMIT 1`;
      if (!backups.length) {
        return NextResponse.json({ message: "No restore points found." }, { status: 404 });
      }

      const latestBackup = backups[0];
      const snapshot = typeof latestBackup.snapshot === 'string' ? JSON.parse(latestBackup.snapshot) : latestBackup.snapshot;

      // 2. Clear current state before restore
      await sql`DELETE FROM "Task"`;
      await sql`DELETE FROM "LearningOpportunity"`;
      await sql`DELETE FROM "ExternalRequest"`;
      await sql`DELETE FROM "TaskSequence"`;
      try {
        await sql`DELETE FROM "RecurringTask"`;
      } catch (e) {}

      // 3. Re-hydrate Sequences
      for (const s of snapshot.sequences || []) {
        await sql`INSERT INTO "TaskSequence" ("monthYear", "nextVal") VALUES (${s.monthYear}, ${s.nextVal})`;
      }

      // 4. Re-hydrate Recurring Tasks
      for (const rt of snapshot.recurringTasks || []) {
        const { id, ...data } = rt;
        const keys = Object.keys(data);
        const values = Object.values(data);
        if (keys.length) {
          await sql.unsafe(`INSERT INTO "RecurringTask" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${values.map((_, i) => `$${i+1}`).join(',')})`, values);
        }
      }

      // 5. Re-hydrate Main Tables (Tasks, LOs, ExtReqs)
      for (const t of snapshot.tasks || []) {
        const { id, ...data } = t;
        const keys = Object.keys(data);
        const values = Object.values(data);
        await sql.unsafe(`INSERT INTO "Task" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${values.map((_, i) => `$${i+1}`).join(',')})`, values);
      }

      for (const lo of snapshot.los || []) {
        const { id, ...data } = lo;
        const keys = Object.keys(data);
        const values = Object.values(data);
        await sql.unsafe(`INSERT INTO "LearningOpportunity" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${values.map((_, i) => `$${i+1}`).join(',')})`, values);
      }

      for (const er of snapshot.extReqs || []) {
        const { id, ...data } = er;
        const keys = Object.keys(data);
        const values = Object.values(data);
        await sql.unsafe(`INSERT INTO "ExternalRequest" (${keys.map(k => `"${k}"`).join(',')}) VALUES (${values.map((_, i) => `$${i+1}`).join(',')})`, values);
      }

      // 6. Fix ID Sequences (Very important for future autoincrements)
      try {
        await sql`SELECT setval(pg_get_serial_sequence('"Task"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "Task"`;
        await sql`SELECT setval(pg_get_serial_sequence('"LearningOpportunity"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "LearningOpportunity"`;
        await sql`SELECT setval(pg_get_serial_sequence('"ExternalRequest"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "ExternalRequest"`;
        await sql`SELECT setval(pg_get_serial_sequence('"RecurringTask"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) FROM "RecurringTask"`;
      } catch (e) {}

      return NextResponse.json({ message: "Database successfully restored to the previous version." });
    }

    return NextResponse.json({ message: "Invalid action type." }, { status: 400 });

  } catch (error: any) {
    console.error("Master Reset Fatal Error:", error);
    return NextResponse.json({ message: "Critical failure during master reset operation.", error: error.message }, { status: 500 });
  }
}
