require('dotenv').config();
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const res = await sql`UPDATE "Task" SET "isApproved" = TRUE WHERE "isApproved" = FALSE AND "requestFrom" = 'System (Recurring)'`;
  console.log('Fixed tasks');
  process.exit(0);
}
run();
