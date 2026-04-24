import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";

export default async function HomePage() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[HomePage] Clerk auth error:", error);
  }

  if (!userId) redirect("/sign-in");

  try {
    await withRetry(() =>
      prisma.user.upsert({
        where: { id: userId as string },
        create: { id: userId as string, email: "user@example.com" },
        update: {},
      })
    );

    let workflow = await withRetry(() =>
      prisma.workflow.findFirst({
        where: { userId: userId as string },
        orderBy: { updatedAt: "desc" },
      })
    );

    if (!workflow) {
      workflow = await withRetry(() =>
        prisma.workflow.create({
          data: { userId: userId as string, name: "My First Workflow", nodes: [], edges: [] },
        })
      );
    }

    redirect(`/workflow/${(workflow as any).id}`);
  } catch (error) {
    console.error("[HomePage] Database error:", error);
    return (
      <div style={{ padding: "2rem", color: "#e4e4ed", textAlign: "center" }}>
        <h2>Something went wrong loading your workspace.</h2>
        <p style={{ color: "#8b8b9e" }}>We encountered a database connection issue. Please try again.</p>
      </div>
    );
  }
}
