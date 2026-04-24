import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  const headersList = await headers();
  const host = headersList.get("host");
  const xForwardedHost = headersList.get("x-forwarded-host");
  const xForwardedProto = headersList.get("x-forwarded-proto");
  
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET (hidden)" : "NOT SET",
    DATABASE_URL: process.env.DATABASE_URL ? "SET (hidden)" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    headers: {
      host,
      xForwardedHost,
      xForwardedProto
    }
  });
}
