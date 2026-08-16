import { task, logger } from "@trigger.dev/sdk/v3";
import { Transloadit, type AssemblyStatus, type CreateAssemblyOptions } from "transloadit";
import { Readable } from "node:stream";
import { getEnv } from "../lib/env";
import { HTTP_IMPORT_HEADERS } from "./transloaditHeaders";

function getClient() {
  const env = getEnv();
  return new Transloadit({
    authKey: env.TRANSLOADIT_AUTH_KEY,
    authSecret: env.TRANSLOADIT_AUTH_SECRET,
  });
}

async function waitForAssembly(client: Transloadit, assemblyId: string, maxMs = 120000): Promise<AssemblyStatus> {
  const start = Date.now();
  let delay = 500; // Start at 500ms instead of fixed 2000ms
  while (Date.now() - start < maxMs) {
    const s = await client.getAssembly(assemblyId);
    if (s.ok === "ASSEMBLY_COMPLETED") {
      logger.info("Assembly completed", { assemblyId, elapsed: Date.now() - start });
      return s;
    }
    if (s.error || s.ok === "ASSEMBLY_ABORTED") throw new Error(`Assembly failed: ${s.error}`);
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 4000); // 500 → 750 → 1125 → 1687 → 2531 → 3796 → 4000
  }
  throw new Error("Assembly timed out");
}

export const uploadImageTask = task({
  id: "upload-image-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 15000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId?: string; fileData?: string; fileUrl?: string; fileName: string; mimeType: string }) => {
    const { nodeId, fileData, fileUrl, fileName } = payload;
    logger.info("Upload image started", { nodeId });

    if (!fileData && !fileUrl) {
      throw new Error("No image data or URL provided. Please upload a file or provide a URL.");
    }

    const client = getClient();
    const opts: CreateAssemblyOptions = {
      params: {
        steps: {
          ...(fileUrl ? { imported: { robot: "/http/import", url: fileUrl, headers: HTTP_IMPORT_HEADERS } } : {}),
          optimized: { robot: "/image/optimize", use: fileUrl ? "imported" : ":original", progressive: true },
          thumbnail: { robot: "/image/resize", use: fileUrl ? "imported" : ":original", width: 400, height: 400, resize_strategy: "fit", imagemagick_stack: "v3.0.0" },
        },
      },
    };
    let assembly: Awaited<ReturnType<typeof client.createAssembly>>;
    if (fileData) {
      // Transloadit SDK v4: `files` expects string paths, `uploads` expects streams
      const buf = Buffer.from(fileData, "base64");
      const stream = Readable.from(buf);
      assembly = await client.createAssembly({ ...opts, uploads: { [fileName]: stream } });
    } else {
      assembly = await client.createAssembly(opts);
    }
    if (!assembly.assembly_id) throw new Error("Transloadit assembly ID missing");
    const done = await waitForAssembly(client, assembly.assembly_id);
    const main = (done.results?.optimized || done.results?.imported || [])[0];
    const thumb = (done.results?.thumbnail || [])[0];
    if (!main) throw new Error("No result from Transloadit");
    const imageUrl = main.ssl_url || main.url;
    if (!imageUrl || typeof imageUrl !== "string") throw new Error("Upload succeeded but no valid URL returned");
    logger.info("Upload image done", { nodeId, imageUrl: imageUrl.slice(0, 80) });
    return { nodeId, success: true, imageUrl, thumbnailUrl: thumb?.ssl_url || thumb?.url || null, width: main.meta?.width || 0, height: main.meta?.height || 0, size: main.size, mimeType: main.mime };
  },
});

export const uploadVideoTask = task({
  id: "upload-video-node",
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId?: string; fileData?: string; fileUrl?: string; fileName: string; mimeType: string }) => {
    const { nodeId, fileData, fileUrl, fileName } = payload;
    logger.info("Upload video started", { nodeId });

    if (!fileData && !fileUrl) {
      throw new Error("No video data or URL provided. Please upload a file or provide a URL.");
    }

    const client = getClient();
    const opts: CreateAssemblyOptions = {
      params: {
        steps: {
          ...(fileUrl ? { imported: { robot: "/http/import", url: fileUrl, headers: HTTP_IMPORT_HEADERS } } : {}),
          stored: { robot: "/video/encode", use: fileUrl ? "imported" : ":original", preset: "empty", ffmpeg_stack: "v6.0.0" },
          thumbnail: { robot: "/video/thumbs", use: fileUrl ? "imported" : ":original", count: 1, ffmpeg_stack: "v6.0.0" },
        },
      },
    };
    let assembly: Awaited<ReturnType<typeof client.createAssembly>>;
    if (fileData) {
      // Transloadit SDK v4: `files` expects string paths, `uploads` expects streams
      const buf = Buffer.from(fileData, "base64");
      const stream = Readable.from(buf);
      assembly = await client.createAssembly({ ...opts, uploads: { [fileName]: stream } });
    } else {
      assembly = await client.createAssembly(opts);
    }
    if (!assembly.assembly_id) throw new Error("Transloadit assembly ID missing");
    const done = await waitForAssembly(client, assembly.assembly_id, 180000);
    const main = (done.results?.stored || [])[0];
    const thumb = (done.results?.thumbnail || [])[0];
    if (!main) throw new Error("No video result from Transloadit");
    const videoUrl = main.ssl_url || main.url;
    if (!videoUrl || typeof videoUrl !== "string") throw new Error("Video upload succeeded but no valid URL returned");
    logger.info("Upload video done", { nodeId, videoUrl: videoUrl.slice(0, 80) });
    return { nodeId, success: true, videoUrl, thumbnailUrl: thumb?.ssl_url || thumb?.url || null, duration: main.meta?.duration, size: main.size, mimeType: main.mime };
  },
});
