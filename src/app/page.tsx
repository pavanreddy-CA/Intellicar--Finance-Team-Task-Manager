import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  console.log("[v0] Session check:", session ? "exists" : "null");
  console.log("[v0] Session user:", session?.user?.email);

  if (!session) {
    console.log("[v0] No session, redirecting to login");
    redirect("/login");
  }

  return <DashboardClient user={session.user} />;
}
