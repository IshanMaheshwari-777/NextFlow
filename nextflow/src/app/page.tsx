import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma, withRetry } from "@/lib/prisma";

export default async function HomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await withRetry(() =>
    prisma.user.upsert({
      where: { id: userId },
      create: { id: userId, email: "user@example.com" },
      update: {},
    })
  );

  let workflow = await withRetry(() =>
    prisma.workflow.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })
  );

  if (!workflow) {
    workflow = await withRetry(() =>
      prisma.workflow.create({
        data: { userId, name: "My First Workflow", nodes: [], edges: [] },
      })
    );
  }

  redirect(`/workflow/${(workflow as any).id}`);
}
