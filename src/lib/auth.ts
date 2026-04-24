import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@intellicar.in" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("[v0] authorize called with email:", credentials?.email);
        
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log("[v0] Missing email or password");
            throw new Error("Invalid credentials");
          }
          
          console.log("[v0] Querying user from database...");
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          console.log("[v0] User found:", !!user);
          
          if (!user || !user.password) {
            console.log("[v0] User not found or no password");
            throw new Error("User not found");
          }

          console.log("[v0] Checking approval status...");
          if ((user as any).isApproved === false) {
            console.log("[v0] User not approved");
            throw new Error("Your account is pending admin approval.");
          }
          
          console.log("[v0] Verifying password...");
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          
          console.log("[v0] Password valid:", isPasswordValid);
          
          if (!isPasswordValid) {
            console.log("[v0] Password invalid");
            throw new Error("Invalid password");
          }
          
          console.log("[v0] Login successful, returning user object");
          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department
          };
        } catch (error) {
          console.log("[v0] Error in authorize:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  callbacks: {
    async jwt({ token, user }) {
      console.log("[v0] jwt callback called, user exists:", !!user);
      if (user) {
        console.log("[v0] Adding user data to JWT token");
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      console.log("[v0] session callback called");
      if (token && session.user) {
        console.log("[v0] Adding token data to session");
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).department = token.department;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  debug: true,
  trustHost: true,
  events: {
    async signIn(message) {
      console.log("[v0] EVENT signIn:", message);
    },
    async signOut(message) {
      console.log("[v0] EVENT signOut:", message);
    },
    async session(message) {
      console.log("[v0] EVENT session:", message);
    }
  }
};
