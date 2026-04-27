const { neon } = require("@neondatabase/serverless");

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`SELECT * FROM "SystemSettings" LIMIT 1`;
    console.log("Columns in SystemSettings:", Object.keys(rows[0]));
  } catch (err) {
    console.error("Check failed:", err);
  }
}

check();
