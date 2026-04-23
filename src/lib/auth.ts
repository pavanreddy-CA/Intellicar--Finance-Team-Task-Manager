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
        console.log("[v0] Auth attempt for:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("[v0] Missing credentials");
          throw new Error("Invalid credentials");
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          console.log("[v0] User found:", user ? "yes" : "no");
          
          if (!user || !user.password) {
            console.log("[v0] User not found or no password");
            throw new Error("User not found");
          }
          
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
          console.log("[v0] Password valid:", isPasswordValid);
          
          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }
          
          console.log("[v0] Auth successful, returning user");
          return {
            id: String(user.id),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.log("[v0] Auth error:", error);
          throw error;
        }
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  }
};
