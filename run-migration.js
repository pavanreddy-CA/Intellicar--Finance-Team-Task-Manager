const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(connectionString, { ssl: 'require' });
  
  try {
    console.log('Running Migration...');
    
    // Add columns to RecurringTemplate
    await sql`
      ALTER TABLE "RecurringTemplate" 
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "endDate" DATE,
      ADD COLUMN IF NOT EXISTS "stopDate" DATE,
      ADD COLUMN IF NOT EXISTS "isStopped" BOOLEAN DEFAULT FALSE;
    `;
    
    // Add columns to Task
    await sql`
      ALTER TABLE "Task"
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT;
    `;
    
    console.log('Migration Successful!');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    await sql.end();
    process.exit();
  }
}

main();
