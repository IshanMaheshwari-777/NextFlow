export type UploadResult = { imageUrl?: string; videoUrl?: string; thumbnailUrl?: string | null; width?: number; height?: number; duration?: number };

/** POSTs to /api/upload (fire-and-forget on the server) then polls for the Trigger.dev result. */
export async function uploadFile(fileData: string, fileName: string, mimeType: string, type: "image" | "video"): Promise<UploadResult> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileData, fileName, mimeType, type }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Upload failed (${res.status})`);
  }
  const { triggerRunId } = await res.json();

  const start = Date.now();
  const maxWaitMs = type === "video" ? 200_000 : 60_000;
  let delay = 800;
  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(`/api/upload/status/${triggerRunId}`);
    if (!statusRes.ok) {
      const err = await statusRes.json().catch(() => ({}));
      throw new Error(err?.error || `Failed to check upload status (${statusRes.status})`);
    }
    const { status, output, error } = await statusRes.json();
    if (status === "COMPLETED") return output as UploadResult;
    if (["FAILED", "CRASHED", "CANCELED", "TIMED_OUT", "SYSTEM_FAILURE"].includes(status)) {
      throw new Error(error || "Upload failed");
    }
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 3000);
  }
  throw new Error("Upload is taking longer than expected. Please try again.");
}
