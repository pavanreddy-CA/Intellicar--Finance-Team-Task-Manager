import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const EMAIL_TO_NAME: Record<string, string> = {
  "pavanreddy@intellicar.in": "Pavan",
  "saikatdas@intellicar.in": "Saikath",
  "sami@intellicar.in": "Sami",
  "hanusha@intellicar.in": "Hanusha",
  "sreenivasulu.t@intellicar.in": "Sreenivas",
  "sharath.shetty@intellicar.in": "Sharath",
  "chandanak@intellicar.in": "Chandana",
  "nikhat@intellicar.in": "Nikhat",
  "venkata.g@intellicar.in": "Venkat",
  "saneja@intellicar.in": "Siddharth"
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.email === "pavanreddy@intellicar.in" || (session.user as any)?.role === "ADMIN";
  const shortName = EMAIL_TO_NAME[session.user.email] || session.user.name || "";

  try {
    const los = await prisma.learningOpportunity.findMany({
      where: isAdmin ? {} : {
        OR: [
          { createdByEmail: session.user.email },
          { identifiedBy: shortName },
          { committedBy: shortName }
        ]
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(los);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch LOs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    const lo = await prisma.learningOpportunity.create({
      data: {
        entity: data.entity,
        dateOfIdentification: new Date(data.dateOfIdentification),
        learningOpportunity: data.learningOpportunity,
        identifiedBy: data.identifiedBy,
        committedBy: data.committedBy,
        resolutionProvided: data.resolutionProvided,
        modeOfCommunication: data.modeOfCommunication,
        emailSub: data.emailSub,
        comments: data.comments,
        createdByEmail: session.user.email,
      }
    });
    return NextResponse.json(lo, { status: 201 });
  } catch (error: any) {
    console.error("LO creation error:", error);
    return NextResponse.json({ message: "Failed to create LO", error: error.message }, { status: 500 });
  }
}
