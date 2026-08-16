import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatDuration(ms?: number): string { if (!ms) return "—"; if (ms < 1000) return `${ms}ms`; return `${(ms / 1000).toFixed(1)}s`; }
export function formatTimestamp(iso: string): string { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
export function getStatusBg(status: string): string {
  switch (status) {
    case "success": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "failed": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "running": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default: return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}
