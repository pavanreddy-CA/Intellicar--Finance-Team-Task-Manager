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
        console.log("[v0] Auth attempt for email:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[v0] Missing credentials");
          throw new Error("Invalid credentials");
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        console.log("[v0] User found:", user ? "yes" : "no");
        
        if (!user || !user.password) {
          console.log("[v0] User not found or no password");
          throw new Error("User not found");
        }

        if ((user as any).isApproved === false) {
          throw new Error("Your account is pending admin approval.");
        }
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }
        
        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.department = (user as any).department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).department = token.department;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  }
};
