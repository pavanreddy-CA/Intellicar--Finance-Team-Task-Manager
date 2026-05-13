import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getServerSession } from "@/lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ message: "Filename and body are required" }, { status: 400 });
  }

  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ message: "Storage configuration missing (Token not found)" }, { status: 500 });
    }

    const blob = await put(filename, request.body, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error: any) {
    console.error("Blob upload failed:", error);
    return NextResponse.json({ message: `Storage Error: ${error.message || "Unknown error"}` }, { status: 500 });
  }
}
