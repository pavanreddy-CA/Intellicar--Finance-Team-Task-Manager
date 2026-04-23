import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Testing database connection...");
  
  try {
    // Test connection
    await prisma.$connect();
    console.log("Database connected successfully!");
    
    // List all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.log("Users in database:", users.length);
    users.forEach(u => console.log(`  - ${u.email} (${u.name}) - ${u.role}`));
    
    // Check system settings
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "singleton" }
    });
    console.log("System settings exist:", settings ? "yes" : "no");
    
  } catch (error) {
    console.error("Database error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
