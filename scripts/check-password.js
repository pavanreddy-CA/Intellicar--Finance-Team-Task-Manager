import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function checkPassword() {
  try {
    console.log("Checking user passwords...");
    const users = await sql`SELECT id, email, password FROM "User"`;
    console.log("Users found:", users.length);
    users.forEach(user => {
      console.log(`User: ${user.email}, Password hash exists: ${!!user.password}, Length: ${user.password?.length || 0}`);
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

checkPassword();
