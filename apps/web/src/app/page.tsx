import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Landing from "@/components/marketing/Landing";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <Landing />;
}
