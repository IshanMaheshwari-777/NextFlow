import { defineConfig } from "@trigger.dev/sdk/v3";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF || "your-project-ref",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  },
  dirs: ["./src/trigger"],
  build: {
    // Trigger.dev Cloud's remote deploy container is a separate machine from local
    // dev/Vercel and needs its own Prisma client generated during the build.
    extensions: [
      prismaExtension({ mode: "legacy", version: "5.22.0", schema: "../../packages/db/prisma/schema.prisma" }),
    ],
  },
});
