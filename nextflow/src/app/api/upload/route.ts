import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk/v3";

export const dynamic = "force-dynamic";

// Base64 is ~33% larger than the underlying binary; these caps land near 10MB / 50MB of real file data.
const MAX_BASE64_LEN = { image: 14_000_000, video: 70_000_000 };

/** Sniffs the first bytes against known image magic numbers instead of trusting the client-sent mimeType. */
function looksLikeImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true; // JPEG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true; // PNG
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true; // GIF
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) return true; // WEBP (RIFF....WEBP)
  return false;
}

/**
 * Kicks off the upload in the "upload-image-node" / "upload-video-node" Trigger.dev
 * tasks and returns immediately — Transloadit encoding (especially video) can run well
 * past Vercel's serverless timeout, so this route no longer blocks on it. The client
 * polls GET /api/upload/status/[triggerRunId] for completion.
 */
export async function POST(req: NextRequest) {
  let userId: string | null = null;
  try {
    const authResult = await auth();
    userId = authResult.userId;
  } catch (error) {
    console.error("[API/Upload] Clerk auth error:", error);
  }
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { fileData?: string; fileName?: string; mimeType?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const { fileData, fileName, mimeType, type } = body;
  if (!fileData || typeof fileData !== "string" || !fileName) {
    return NextResponse.json({ error: "fileData and fileName are required" }, { status: 400 });
  }

  const isVideo = type === "video" || (typeof mimeType === "string" && mimeType.startsWith("video/"));
  const limit = isVideo ? MAX_BASE64_LEN.video : MAX_BASE64_LEN.image;
  if (fileData.length > limit) {
    return NextResponse.json({ error: `File is too large (max ${isVideo ? "50MB" : "10MB"}).` }, { status: 413 });
  }

  // Verify the bytes actually look like an image before trusting the client's claim —
  // video signatures are far more varied, so we defer that check to Transloadit itself,
  // which will cleanly reject a mismatched file rather than silently mis-processing it.
  if (!isVideo) {
    const head = Buffer.from(fileData.slice(0, 64), "base64");
    if (!looksLikeImage(head)) {
      return NextResponse.json({ error: "File does not look like a valid image." }, { status: 400 });
    }
  }

  try {
    const handle = await tasks.trigger(isVideo ? "upload-video-node" : "upload-image-node", {
      nodeId: "standalone-upload",
      fileData,
      fileName,
      mimeType: mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
    });
    return NextResponse.json({ triggerRunId: handle.id }, { status: 202 });
  } catch (err) {
    console.error("[/api/upload] Failed to enqueue upload:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to start upload" }, { status: 502 });
  }
}
