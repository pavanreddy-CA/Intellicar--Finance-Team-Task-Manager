const { getDb } = require('./src/lib/db');
async function check() {
  try {
    const sql = getDb();
    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = '"RecurringTemplate"'::regclass;
    `;
    console.log(JSON.stringify(constraints, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
