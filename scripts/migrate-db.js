const { neon } = require("@neondatabase/serverless");

async function migrate() {
  const sql = neon(process.env.DATABASE_URL);
  console.log("Migrating database...");
  
  try {
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportFrequency" TEXT DEFAULT 'OFF'`;
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportTimes" TEXT DEFAULT '10:00'`;
    await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "paymentReportEmail" TEXT DEFAULT 'pavanreddy@intellicar.in'`;
    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

migrate();
