import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardClient from "@/components/DashboardClient";

export default async function Dashboard() {
  console.log("[Dashboard] Checking session...");
  const session = await getSession();
  console.log("[Dashboard] Session found:", !!session);

  if (!session) {
    console.log("[Dashboard] No session, redirecting to /login");
    redirect("/login");
  }

  console.log("[Dashboard] Session valid, rendering dashboard for:", session.user.email);
  return <DashboardClient user={session.user} />;
}
