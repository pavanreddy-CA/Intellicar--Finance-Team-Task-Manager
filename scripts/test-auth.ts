import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const testEmail = "pavanreddy@intellicar.in";
  const testPassword = "test123"; // You can change this to the actual password
  
  console.log("Testing auth for:", testEmail);
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: testEmail }
    });
    
    if (!user) {
      console.log("User not found!");
      return;
    }
    
    console.log("User found:", user.name);
    console.log("Has password:", user.password ? "yes" : "no");
    console.log("Password hash length:", user.password?.length);
    
    if (user.password) {
      // Test password comparison
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log("Password 'test123' valid:", isValid);
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
