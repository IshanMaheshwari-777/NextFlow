import Link from "next/link";
import { RotateCw, DatabaseZap } from "lucide-react";
import type { DbOutage } from "@/lib/dbErrors";

const DEV_HINT: Record<DbOutage, string> = {
  quota: "Postgres provider rejected the connection: project quota exceeded. Upgrade the Neon plan, wait for the monthly reset, or point DATABASE_URL at another database.",
  unreachable: "Couldn't connect to Postgres. Check DATABASE_URL and that the database is running (Neon computes can take a few seconds to wake).",
  misconfigured: "DATABASE_URL is missing or invalid in this environment.",
};

/** Shown instead of a crash when the database is down — users learn their work is safe and what to do. */
export default function ServiceUnavailable({ kind, retryHref }: { kind: DbOutage; retryHref: string }) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-icon"><DatabaseZap size={22} /></div>
        <h1>We&apos;ll be right back</h1>
        <p>NextFlow can&apos;t reach its database at the moment, so your workflows can&apos;t be loaded. Nothing has been lost — everything you saved is still there.</p>
        <div className="status-actions">
          <a href={retryHref} className="btn btn-primary"><RotateCw size={14} /> Try again</a>
          <Link href="/" className="btn btn-secondary">Go to homepage</Link>
        </div>
        {isDev && <p className="status-dev"><strong>Developer note:</strong> {DEV_HINT[kind]}</p>}
      </div>
    </main>
  );
}
