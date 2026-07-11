import { task, logger } from "@trigger.dev/sdk/v3";
import { Transloadit } from "transloadit";
import { getEnv } from "../lib/env";

async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  const res = await fetch(url); const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78) {
    return { width: (bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19], height: (bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23] };
  }
  for (let i = 0; i < bytes.length - 8; i++) {
    if (bytes[i] === 0xff && (bytes[i+1] === 0xc0 || bytes[i+1] === 0xc2)) return { height: (bytes[i+5] << 8) | bytes[i+6], width: (bytes[i+7] << 8) | bytes[i+8] };
  }
  return { width: 1000, height: 1000 };
}

export const cropImageTask = task({
  id: "crop-image-node",
  retry: { maxAttempts: 3, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2 },
  run: async (payload: { nodeId: string; workflowRunId: string; imageUrl: string; x_percent?: number; y_percent?: number; width_percent?: number; height_percent?: number }) => {
    const { nodeId, x_percent = 0, y_percent = 0, width_percent = 100, height_percent = 100 } = payload;
    const imageUrl = payload.imageUrl;

    if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.startsWith("http")) {
      throw new Error(`Image URL is missing or invalid (got ${typeof imageUrl}). Connect an image source to this node.`);
    }

    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const clampedX = clamp(x_percent);
    const clampedY = clamp(y_percent);
    const clampedW = clamp(width_percent);
    const clampedH = clamp(height_percent);

    // Validate minimum crop size
    if (clampedW <= 0 || clampedH <= 0) {
      throw new Error(`Crop dimensions must be greater than 0% (got width: ${width_percent}%, height: ${height_percent}%)`);
    }

    const { width: ow, height: oh } = await getImageDimensions(imageUrl);
    const cx = Math.round((clampedX / 100) * ow);
    const cy = Math.round((clampedY / 100) * oh);
    const cw = Math.max(1, Math.min(Math.round((clampedW / 100) * ow), ow - cx));
    const ch = Math.max(1, Math.min(Math.round((clampedH / 100) * oh), oh - cy));

    logger.info("Crop debug", {
      imageUrl: imageUrl.slice(0, 80),
      x_percent: clampedX,
      y_percent: clampedY,
      width_percent: clampedW,
      height_percent: clampedH,
      computed: { cx, cy, cw, ch },
      original: { ow, oh },
    });

    const env = getEnv();
    const client = new Transloadit({ authKey: env.TRANSLOADIT_AUTH_KEY, authSecret: env.TRANSLOADIT_AUTH_SECRET });
    const assembly = await client.createAssembly({
      params: {
        steps: {
          imported: { robot: "/http/import", url: imageUrl },
          cropped: {
            robot: "/image/resize",
            use: "imported",
            crop: {
              x1: cx,
              y1: cy,
              x2: cx + cw,
              y2: cy + ch,
            },
            imagemagick_stack: "v3.0.0",
          },
        },
      },
    });
    const start = Date.now();
    let done: Awaited<ReturnType<typeof client.getAssembly>> | undefined;
    let delay = 500;
    while (Date.now() - start < 60000) {
      const s = await client.getAssembly(assembly.assembly_id as string);
      if (s.ok === "ASSEMBLY_COMPLETED") { done = s; break; }
      if (s.error || s.ok === "ASSEMBLY_ABORTED") throw new Error(`Crop failed: ${s.error}`);
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 4000);
    }
    if (!done) throw new Error("Crop timed out");
    const file = (done.results?.cropped || [])[0];
    if (!file) throw new Error("No cropped result");
    const croppedUrl = file.url || file.ssl_url;
    if (!croppedUrl) throw new Error("Crop succeeded but no URL returned");
    return { nodeId, success: true, imageUrl: croppedUrl, width: file.meta?.width || cw, height: file.meta?.height || ch, size: file.size };
  },
});
