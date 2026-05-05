require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const tasks = await sql`SELECT id, "taskName", "departmentName", "isApproved", "requestFrom" FROM "Task"`;
  console.log(JSON.stringify(tasks, null, 2));
  process.exit(0);
}
run();
