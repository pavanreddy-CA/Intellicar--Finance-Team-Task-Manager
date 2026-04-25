const { neon } = require("@neondatabase/serverless");
require("dotenv").config({ path: ".env" });

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    return;
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log("Adding originalRequestType and transferStatus columns to ExternalRequest...");
    
    // Add columns if they don't exist
    await sql`
      ALTER TABLE "ExternalRequest" 
      ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT,
      ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'
    `;

    console.log("Backfilling originalRequestType for existing records...");
    await sql`
      UPDATE "ExternalRequest" 
      SET "originalRequestType" = "requestType" 
      WHERE "originalRequestType" IS NULL
    `;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrate();
