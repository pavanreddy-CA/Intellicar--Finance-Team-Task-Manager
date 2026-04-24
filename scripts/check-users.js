import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  try {
    console.log("Checking users in database...");
    const users = await sql`SELECT id, email, name, role, "isApproved" FROM "User"`;
    console.log("Users found:", users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error checking users:", error);
  }
}

checkUsers();
