import { task, logger } from "@trigger.dev/sdk/v3";
import { Transloadit } from "transloadit";
import { getEnv } from "../lib/env";
import { HTTP_IMPORT_HEADERS } from "./transloaditHeaders";

export const extractFrameTask = task({
  id: "extract-frame-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 2000, maxTimeoutInMs: 15000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; video_url: string; timestamp?: number | string }) => {
    const { nodeId, timestamp = 0 } = payload;
    // Defensively extract string URL — upstream may pass an object { url, videoUrl, ... }
    let video_url: string;
    const rawUrl = payload.video_url;
    if (typeof rawUrl === "string") {
      video_url = rawUrl;
    } else if (rawUrl && typeof rawUrl === "object") {
      const obj = rawUrl as { url?: string; videoUrl?: string; output?: string };
      video_url = obj.url || obj.videoUrl || obj.output || "";
    } else {
      video_url = "";
    }

    if (!video_url || typeof video_url !== "string" || !video_url.startsWith("http")) {
      throw new Error(`Video URL is missing or invalid (got ${typeof payload.video_url}). Connect a video source to this node.`);
    }

    // ROOT CAUSE FIX: Transloadit /video/thumbs `offset_seconds` offsets from
    // calculated positions (midpoint with count:1), NOT absolute timestamps.
    // The correct param for an exact timestamp is `offsets: [seconds]`.
    // `offsets` cannot be combined with `count`.
    const targetSeconds = Math.max(0, Number(timestamp) || 0);
    logger.info("Extract frame", { nodeId, video_url: video_url.slice(0, 80), targetSeconds, rawTimestamp: timestamp });

    // Transloadit's robot params are only loosely typed by the SDK; this shape is
    // specific to the /video/thumbs robot and doesn't match its generic step type.
    const thumbStep = {
      robot: "/video/thumbs",
      use: "imported",
      offsets: [targetSeconds],  // absolute timestamp array — NOT count + offset_seconds
      format: "jpg",
      quality: 90,
      ffmpeg_stack: "v6.0.0",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const env = getEnv();
    const client = new Transloadit({ authKey: env.TRANSLOADIT_AUTH_KEY, authSecret: env.TRANSLOADIT_AUTH_SECRET });
    const assembly = await client.createAssembly({ params: { steps: { imported: { robot: "/http/import" as const, url: video_url, headers: HTTP_IMPORT_HEADERS }, frame: thumbStep } } });
    const start = Date.now();
    let done: Awaited<ReturnType<typeof client.getAssembly>> | undefined;
    let delay = 500;
    while (Date.now() - start < 120000) {
      const s = await client.getAssembly(assembly.assembly_id as string);
      if (s.ok === "ASSEMBLY_COMPLETED") { done = s; break; }
      if (s.error || s.ok === "ASSEMBLY_ABORTED") throw new Error(`Extract frame failed: ${s.error}`);
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 4000);
    }
    if (!done) throw new Error("Extract frame timed out");
    const file = (done.results?.frame || [])[0];
    if (!file) throw new Error("No frame extracted");
    const imageUrl = file.ssl_url || file.url;
    if (!imageUrl) throw new Error("Frame extraction succeeded but no URL returned");
    logger.info("Extract frame done", { nodeId, imageUrl: imageUrl.slice(0, 80), thumbOffset: file.meta?.thumb_offset });
    return { nodeId, success: true, imageUrl, mimeType: file.mime || "image/jpeg", width: file.meta?.width || 0, height: file.meta?.height || 0, size: file.size };
  },
});
