import { getDb } from '../src/lib/db';

async function inspect() {
  const sql = getDb();
  console.log('Inspecting ExternalRequest table...');
  try {
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ExternalRequest'
    `;
    console.log('Columns found:', JSON.stringify(columns, null, 2));
  } catch (error) {
    console.error('Inspection failed:', error);
  }
}

inspect();
