import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Request rejected and user removed" });
  } catch (error: any) {
    console.error("REJECT ERROR:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
