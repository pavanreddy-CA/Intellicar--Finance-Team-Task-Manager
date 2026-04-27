import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-in-production"
);

// Wrapper for compatibility with existing API routes that call getServerSession(authOptions)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getServerSession(_authOptions?: any): Promise<Session | null> {
  return getSession();
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
}

export interface Session {
  user: SessionUser;
}

// Create a JWT token
export async function createToken(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);
  return token;
}

// Verify and decode a JWT token
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return (payload as any).user as SessionUser;
  } catch (error) {
    return null;
  }
}

// Get the current session from cookies
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("session-token")?.value;
    
    if (!token) {
      return null;
    }
    
    const payload = await verifyToken(token);
    
    if (!payload || !payload.id) {
      return null;
    }

    // Fetch LATEST user data from DB to ensure instant updates (role/dept changes/suspension)
    const sql = getDb();
    const users = await sql`
      SELECT id, email, name, role, department, "isSuspended"
      FROM "User"
      WHERE id = ${payload.id}
      LIMIT 1
    `;
    
    if (users.length === 0) return null;
    const user = users[0];

    // If account is suspended, block session immediately
    if (user.isSuspended) {
      return null;
    }
    
    return { 
      user: {
        id: String(user.id),
        email: user.email || "",
        name: user.name || "",
        role: user.role || "",
        department: user.department || "",
      } 
    };
  } catch (error) {
    return null;
  }
}

// Authenticate user with email and password
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; user?: SessionUser; error?: string }> {
  try {
    // Find user in database using Neon serverless
    const sql = getDb();
    
    // --- Self-healing Migration ---
    try {
      // Add isSuspended column
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE`;
      
      // Add Recurring Activities column to SystemSettings
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "recurringMatrix" TEXT DEFAULT '{}'`;

      // Add Entity Controls column to SystemSettings
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "entityMatrix" TEXT DEFAULT '{}'`;

      // Add Home Content column to SystemSettings
      await sql`ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "homeContent" TEXT DEFAULT '{}'`;

      // Add missing columns to ExternalRequest
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "entityName" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "originalRequestType" TEXT`;
      await sql`ALTER TABLE "ExternalRequest" ADD COLUMN IF NOT EXISTS "transferStatus" TEXT DEFAULT 'O'`;

      // Add Recurring fields to Task table for tracking
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "periodKey" TEXT`;
      await sql`ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "templateId" INTEGER`;

      // Create RecurringTemplate table
      await sql`
        CREATE TABLE IF NOT EXISTS "RecurringTemplate" (
          id SERIAL PRIMARY KEY,
          "taskNamePattern" TEXT NOT NULL,
          "entityName" TEXT NOT NULL,
          "taskType" TEXT NOT NULL,
          "departmentName" TEXT NOT NULL,
          frequency TEXT NOT NULL,
          "dayOffset" INTEGER DEFAULT 0,
          "monthOffset" INTEGER DEFAULT 0,
          "defaultOwner" TEXT,
          "defaultReviewer" TEXT,
          "isActive" BOOLEAN DEFAULT TRUE,
          "lastGeneratedPeriod" TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;
    } catch (e) {
      console.log("Migration check done/failed gracefully");
    }
    const users = await sql`
      SELECT id, email, name, password, role, department, "isApproved", "isSuspended"
      FROM "User"
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    
    const user = users[0];
    
    console.log("[v0] Auth debug - User found:", !!user, user?.email);
    if (!user) {
      return { success: false, error: "Invalid email address" };
    }
    
    console.log("[v0] Auth debug - Password exists:", !!user.password);
    console.log("[v0] Auth debug - Is suspended:", user.isSuspended);
    console.log("[v0] Auth debug - Is approved:", user.isApproved);
    if (!user.password) {
      return { success: false, error: "Account error: No password set" };
    }
    
    // Check if account is suspended
    if (user.isSuspended) {
      return { success: false, error: "Your account is temporarily on hold. Please contact Admin." };
    }

    // Check if user is approved
    if (user.isApproved === false) {
      return { success: false, error: "Your account is pending admin approval." };
    }
    
    // Verify password
    console.log("[v0] Auth debug - Comparing passwords...");
    const isValid = await bcrypt.compare(password, user.password);
    console.log("[v0] Auth debug - Password valid:", isValid);
    if (!isValid) {
      return { success: false, error: "Invalid password" };
    }
    
    // Return user data
    return {
      success: true,
      user: {
        id: String(user.id),
        email: user.email || "",
        name: user.name || "",
        role: user.role || "",
        department: user.department || "",
      }
    };
  } catch (error: any) {
    console.error("[Session] Auth error:", error.message, error);
    console.error("[v0] Auth error full:", JSON.stringify(error, null, 2));
    return { success: false, error: "Authentication failed" };
  }
}
