import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    
    console.log("Running manual migration for transfer tracking...");
    
    // Add columns to ExternalRequest if they don't exist
    await sql`
      ALTER TABLE "ExternalRequest" 
      ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT,
      ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'
    `;

    // Add columns to Task if they don't exist
    await sql`
      ALTER TABLE "Task" 
      ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT,
      ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'
    `;

    // Backfill ExternalRequest
    await sql`
      UPDATE "ExternalRequest" 
      SET "originalRequestType" = "requestType" 
      WHERE "originalRequestType" IS NULL
    `;

    // Backfill Task
    await sql`
      UPDATE "Task" 
      SET "transferStatus" = 'O' 
      WHERE "transferStatus" IS NULL
    `;

    return NextResponse.json({ message: "Migration completed successfully!" });
  } catch (error: any) {
    console.error("Migration failed:", error);
    return NextResponse.json({ message: "Migration failed", error: error.message }, { status: 500 });
  }
}
