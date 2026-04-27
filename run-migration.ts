import { getDb } from './src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  // Manual env loading
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
        }
      });
    }
  } catch (err) {
    console.error('Error loading .env:', err);
  }

  const sql = getDb();
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
    process.exit();
  }
}

main();
