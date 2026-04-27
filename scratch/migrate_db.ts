import { getDb } from '../src/lib/db';

async function migrate() {
  const sql = getDb();
  console.log('Starting migration...');
  try {
    await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferredBy" TEXT`;
    console.log('Migration successful: transferredBy column added.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
