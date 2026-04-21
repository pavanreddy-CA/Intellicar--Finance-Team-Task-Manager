import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcrypt";

const EMPLOYEES = [
  { name: "Saikath", email: "saikatdas@intellicar.in" },
  { name: "Sami", email: "sami@intellicar.in" },
  { name: "Hanusha", email: "hanusha@intellicar.in" },
  { name: "Sreenivas", email: "sreenivasulu.t@intellicar.in" },
  { name: "Sharath", email: "sharath.shetty@intellicar.in" },
  { name: "Chandana", email: "chandanak@intellicar.in" },
  { name: "Nikhat", email: "nikhat@intellicar.in" },
  { name: "Venkat", email: "venkata.g@intellicar.in" },
  { name: "Sidharth Saneja", email: "saneja@intellicar.in" },
  { name: "Pavan Reddy", email: "pavanreddy@intellicar.in" }
];

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const defaultPassword = "Intellicar@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    let createdCount = 0;
    let skippedCount = 0;

    for (const emp of EMPLOYEES) {
      const existing = await prisma.user.findUnique({
        where: { email: emp.email }
      });

      if (!existing) {
        await prisma.user.create({
          data: {
            name: emp.name,
            email: emp.email,
            password: hashedPassword,
            role: "USER"
          }
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({ 
      message: `Bulk import complete. Created ${createdCount} users, skipped ${skippedCount} existing users.`,
      defaultPassword: defaultPassword
    });
  } catch (error: any) {
    console.error("Bulk add error:", error);
    return NextResponse.json({ message: "Failed to bulk add users", error: error.message }, { status: 500 });
  }
}
