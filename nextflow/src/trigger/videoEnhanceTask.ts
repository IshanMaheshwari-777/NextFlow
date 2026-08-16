import { task, logger } from "@trigger.dev/sdk/v3";
import { Transloadit } from "transloadit";
import { getEnv } from "../lib/env";
import { HTTP_IMPORT_HEADERS } from "./transloaditHeaders";

const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "720p":  { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K":    { width: 3840, height: 2160 },
};

const STRENGTH_MAP: Record<string, { denoise: string; sharpen: string; eq: string }> = {
  light: {
    denoise: "hqdn3d=2:2:2:2",
    sharpen: "unsharp=3:3:0.4:3:3:0.2",
    eq: "eq=contrast=1.05:saturation=1.1",
  },
  medium: {
    denoise: "hqdn3d=4:4:3:3",
    sharpen: "unsharp=5:5:0.8:5:5:0.4",
    eq: "eq=contrast=1.1:saturation=1.2",
  },
  strong: {
    denoise: "hqdn3d=6:6:5:5",
    sharpen: "unsharp=7:7:1.2:7:7:0.6",
    eq: "eq=contrast=1.15:saturation=1.3:brightness=0.02",
  },
};

export const videoEnhanceTask = task({
  id: "video-enhance-node",
  retry: { maxAttempts: 2, minTimeoutInMs: 5000, maxTimeoutInMs: 30000, factor: 2 },

  run: async (payload: {
    nodeId: string;
    workflowRunId: string;
    video_url: string;
    resolution?: string;
    strength?: string;
  }): Promise<{
    nodeId: string;
    success: true;
    videoUrl: string;
    output: string;
    resolution: string;
    strength: string;
  }> => {
    const {
      nodeId,
      video_url,
      resolution = "1080p",
      strength = "medium",
    } = payload;

    logger.info("Video enhance task started", { nodeId, video_url, resolution, strength });

    if (!video_url) throw new Error("video_url is required for Video Enhance node");
    const env = getEnv();

    const { width, height } = RESOLUTION_MAP[resolution] ?? RESOLUTION_MAP["1080p"];
    const { denoise, sharpen, eq } = STRENGTH_MAP[strength] ?? STRENGTH_MAP["medium"];
    const vf = `scale=${width}:${height}:flags=lanczos,${denoise},${sharpen},${eq}`;

    logger.info("FFmpeg filter chain", { vf, width, height });

    const client = new Transloadit({
      authKey: env.TRANSLOADIT_AUTH_KEY,
      authSecret: env.TRANSLOADIT_AUTH_SECRET,
    });

    const assembly = await client.createAssembly({
      params: {
        steps: {
          imported: {
            robot: "/http/import",
            url: video_url,
            headers: HTTP_IMPORT_HEADERS,
          },
          enhanced: {
            robot: "/video/encode",
            use: "imported",
            preset: "empty",
            ffmpeg_stack: "v6.0.0",
            ffmpeg: {
              "vf": vf,
              "codec:v": "libx264",
              "crf": "18",
              "preset": "slow",
              "codec:a": "copy",
              "movflags": "+faststart",
            },
          },
        },
      },
    });

    if (!assembly.assembly_id) throw new Error("Transloadit assembly ID missing");
    logger.info("Assembly created", { assemblyId: assembly.assembly_id });

    const maxWaitMs = 180_000;
    const startTime = Date.now();
    let completed: Awaited<ReturnType<typeof client.getAssembly>> | undefined;

    while (Date.now() - startTime < maxWaitMs) {
      const status = await client.getAssembly(assembly.assembly_id);
      if (status.ok === "ASSEMBLY_COMPLETED") { completed = status; break; }
      if (status.error || status.ok === "ASSEMBLY_ABORTED") {
        throw new Error(`Video enhance assembly failed: ${status.error || "ABORTED"} — ${status.message || ""}`);
      }
      logger.info("Assembly still processing...", {
        assemblyId: assembly.assembly_id,
        status: status.ok,
        elapsed: `${Math.round((Date.now() - startTime) / 1000)}s`,
      });
      await new Promise(r => setTimeout(r, 4000));
    }

    if (!completed) {
      throw new Error(
        `Video enhance timed out after ${maxWaitMs / 1000}s. Try a shorter video or lower target resolution.`
      );
    }

    const enhancedResults = completed.results?.enhanced || [];
    if (enhancedResults.length === 0) {
      const keys = Object.keys(completed.results || {});
      throw new Error(`No enhanced video in results. Available keys: ${keys.join(", ")}`);
    }

    const enhanced = enhancedResults[0];
    const videoUrl = enhanced.ssl_url || enhanced.url;
    if (!videoUrl) throw new Error("Video enhance succeeded but no URL returned");

    logger.info("Video enhance completed", { nodeId, videoUrl, resolution, strength });

    return { nodeId, success: true, videoUrl, output: videoUrl, resolution, strength };
  },
});
