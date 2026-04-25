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
    // Add isSuspended column if it doesn't exist (Runs here because users can't login to trigger the User Management one)
    try {
      await sql`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN DEFAULT FALSE`;
    } catch (e) {
      console.log("Migration check done");
    }

    const users = await sql`
      SELECT id, email, name, password, role, department, "isApproved", "isSuspended"
      FROM "User"
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;
    
    const user = users[0];
    
    if (!user) {
      return { success: false, error: "Invalid email address" };
    }
    
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
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return { success: false, error: "Invalid password provided" };
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
    console.error("[Session] Auth error:", error);
    return { success: false, error: "System Error: " + (error?.message || "Unknown error") };
  }
}
