import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.email === "pavanreddy@intellicar.in" || (session?.user as any)?.role === "ADMIN";

  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { action } = await req.json();
    const loId = parseInt(id);

    if (action === "APPROVE") {
      await prisma.learningOpportunity.update({
        where: { id: loId },
        data: {
          editRequested: false,
          editRequestReason: null,
        }
      });
    } else {
      await prisma.learningOpportunity.update({
        where: { id: loId },
        data: {
          editRequested: false,
          editRequestReason: null
        }
      });
    }

    return NextResponse.json({ message: `Edit request ${action.toLowerCase()}d` });
  } catch (error) {
    return NextResponse.json({ message: "Failed to process edit request" }, { status: 500 });
  }
}
