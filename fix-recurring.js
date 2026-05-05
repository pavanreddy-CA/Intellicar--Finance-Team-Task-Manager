require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    // 1. Update tasks that have a templateId but are missing frequency or have "--"
    const results = await sql`
      UPDATE "Task" t
      SET "frequency" = rt."frequency"
      FROM "RecurringTemplate" rt
      WHERE t."templateId" = rt.id
      AND (t."frequency" IS NULL OR t."frequency" = '--' OR t."frequency" = '')
      RETURNING t.id, t."taskName", t."frequency"
    `;
    
    console.log(`Updated ${results.length} tasks with correct frequency codes.`);
    results.forEach(r => console.log(`- Task ${r.id}: ${r.taskName} -> ${r.frequency}`));

    // 2. Also ensure all recurring tasks are approved while we are at it
    const approvedResults = await sql`
      UPDATE "Task"
      SET "isApproved" = TRUE
      WHERE "requestFrom" = 'System (Recurring)' AND "isApproved" = FALSE
      RETURNING id
    `;
    console.log(`Force-approved ${approvedResults.length} recurring tasks.`);

  } catch (err) {
    console.error("Database fix error:", err);
  } finally {
    process.exit(0);
  }
}

run();
