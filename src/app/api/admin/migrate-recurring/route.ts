import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    /* const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } */

    const sql = getDb();
    console.log('Starting Migration via API...');
    
    // Add columns to RecurringTemplate
    await (sql as any).query(`
      ALTER TABLE "RecurringTemplate" 
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "endDate" DATE,
      ADD COLUMN IF NOT EXISTS "stopDate" DATE,
      ADD COLUMN IF NOT EXISTS "isStopped" BOOLEAN DEFAULT FALSE;
    `);
    
    // Add columns to Task
    await (sql as any).query(`
      ALTER TABLE "Task"
      ADD COLUMN IF NOT EXISTS "financeFunction" TEXT;
    `);
    
    return NextResponse.json({ message: 'Migration Successful!' });
  } catch (error: any) {
    console.error('Migration API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
