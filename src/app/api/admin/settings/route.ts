import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { id: "singleton" }
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { id: "singleton" }
      });
    }

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    
    if (userRole !== "ADMIN" && session?.user?.email !== "pavanreddy@intellicar.in") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { 
      reminderFrequency, 
      reminderTimes, 
      managerReportFrequency, 
      managerReportTimes,
      loReportFrequency,
      loReportTimes,
      managerEmail,
      loReportEmail,
      masterDepartments,
      masterEntities,
      masterTaskTypes
    } = body;

    const settings = await prisma.systemSettings.upsert({
      where: { id: "singleton" },
      update: {
        reminderFrequency,
        reminderTimes,
        managerReportFrequency,
        managerReportTimes,
        loReportFrequency,
        loReportTimes,
        managerEmail,
        loReportEmail,
        masterDepartments,
        masterEntities,
        masterTaskTypes
      },
      create: {
        id: "singleton",
        reminderFrequency,
        reminderTimes,
        managerReportFrequency,
        managerReportTimes,
        loReportFrequency,
        loReportTimes,
        managerEmail,
        loReportEmail,
        masterDepartments,
        masterEntities,
        masterTaskTypes
      }
    });

    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
