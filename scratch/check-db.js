const { getDb } = require('./src/lib/db');
async function check() {
  try {
    const sql = getDb();
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'RecurringTemplate'`;
    console.log(cols.map(c => c.column_name));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
