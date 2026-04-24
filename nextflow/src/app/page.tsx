import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[HomePage] Clerk auth error:", error);
  }

  if (!userId) {
  return redirect("/sign-in");
}

  try {
    await withRetry(() =>
      prisma.user.upsert({
        where: { id: userId as string },
        create: { id: userId as string, email: `${userId}@example.com` },
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
  } catch (error: any) {
    if (error?.message === "NEXT_REDIRECT" || error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("[HomePage] Database error:", error);
    return (
      <div style={{ padding: "2rem", color: "#e4e4ed", textAlign: "center", maxWidth: "800px", margin: "0 auto" }}>
        <h2>Something went wrong loading your workspace.</h2>
        <p style={{ color: "#8b8b9e", marginBottom: "1rem" }}>We encountered a database connection issue. Please try again.</p>
        <div style={{ background: "#1c1c28", padding: "1rem", borderRadius: "8px", textAlign: "left", fontFamily: "monospace", fontSize: "0.85rem", overflowX: "auto" }}>
          <strong style={{ color: "#f87171" }}>Error Details:</strong>
          <pre style={{ margin: "0.5rem 0 0 0", whiteSpace: "pre-wrap", color: "#fca5a5" }}>
            {error?.message || error?.toString() || "Unknown error"}
          </pre>
        </div>
      </div>
    );
  }
}
