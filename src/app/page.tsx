import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardWrapper from "@/components/DashboardWrapper";

export default async function Dashboard() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardWrapper user={session.user} />;
}
