import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcrypt";

const sql = neon(process.env.DATABASE_URL!);

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
    
    const user = await verifyToken(token);
    
    if (!user) {
      return null;
    }
    
    return { user };
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
    const users = await sql`
      SELECT id, email, name, password, role, department, "isApproved"
      FROM "User"
      WHERE email = ${email}
      LIMIT 1
    `;
    
    const user = users[0];
    
    if (!user || !user.password) {
      return { success: false, error: "User not found" };
    }
    
    // Check if user is approved
    if (user.isApproved === false) {
      return { success: false, error: "Your account is pending admin approval." };
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
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
    console.error("[Session] Auth error:", error);
    return { success: false, error: "Authentication failed" };
  }
}
