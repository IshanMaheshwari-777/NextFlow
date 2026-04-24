import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Transloadit } from "transloadit";
import { Readable } from "node:stream";

// Allow up to 60s for video uploads
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Upload] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();
  try {
    const body = await req.json();
    const { fileData, fileName, mimeType, type } = body;

    if (!fileData || !fileName) {
      return NextResponse.json({ error: "fileData and fileName are required" }, { status: 400 });
    }

    const client = new Transloadit({
      authKey: process.env.TRANSLOADIT_AUTH_KEY!,
      authSecret: process.env.TRANSLOADIT_AUTH_SECRET!,
    });

    const isVideo = type === "video" || mimeType?.startsWith("video/");

    // Build assembly steps based on file type
    const steps: Record<string, any> = isVideo
      ? {
          stored: { robot: "/video/encode", use: ":original", preset: "empty", ffmpeg_stack: "v6.0.0" },
          thumbnail: { robot: "/video/thumbs", use: ":original", count: 1, ffmpeg_stack: "v6.0.0" },
        }
      : {
          optimized: { robot: "/image/optimize", use: ":original", progressive: true },
          thumbnail: { robot: "/image/resize", use: ":original", width: 400, height: 400, resize_strategy: "fit", imagemagick_stack: "v3.0.0" },
        };

    const buf = Buffer.from(fileData, "base64");
    const stream = Readable.from(buf);
    const assembly = await client.createAssembly({
      params: { steps },
      uploads: { [fileName]: stream },
    });

    // Poll for completion
    let delay = 500;
    const maxWait = 120000;
    const pollStart = Date.now();
    let done: any;
    while (Date.now() - pollStart < maxWait) {
      const s = await client.getAssembly(assembly.assembly_id as string);
      if (s.ok === "ASSEMBLY_COMPLETED") { done = s; break; }
      if (s.error || s.ok === "ASSEMBLY_ABORTED") {
        return NextResponse.json({ error: `Upload failed: ${s.error}` }, { status: 500 });
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay * 1.5, 4000);
    }

    if (!done) {
      return NextResponse.json({ error: "Upload timed out" }, { status: 504 });
    }

    const elapsed = Date.now() - start;

    if (isVideo) {
      const main = (done.results?.stored || [])[0];
      const thumb = (done.results?.thumbnail || [])[0];
      if (!main) return NextResponse.json({ error: "No video result" }, { status: 500 });
      const videoUrl = main.ssl_url || main.url;
      return NextResponse.json({
        success: true,
        videoUrl,
        thumbnailUrl: thumb?.ssl_url || thumb?.url || null,
        duration: elapsed,
      });
    } else {
      const main = (done.results?.optimized || [])[0];
      const thumb = (done.results?.thumbnail || [])[0];
      if (!main) return NextResponse.json({ error: "No image result" }, { status: 500 });
      const imageUrl = main.ssl_url || main.url;
      return NextResponse.json({
        success: true,
        imageUrl,
        thumbnailUrl: thumb?.ssl_url || thumb?.url || null,
        width: main.meta?.width || 0,
        height: main.meta?.height || 0,
        duration: elapsed,
      });
    }
  } catch (err: any) {
    console.error("[/api/upload] Error:", err?.message);
    return NextResponse.json({
      error: err?.message || "Upload failed",
      duration: Date.now() - start,
    }, { status: 500 });
  }
}
