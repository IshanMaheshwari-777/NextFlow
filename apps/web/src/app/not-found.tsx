import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="status-page">
      <div className="status-card">
        <div className="status-icon"><Compass size={22} /></div>
        <h1>This page doesn&apos;t exist</h1>
        <p>The workflow may have been deleted, or the link is mistyped.</p>
        <div className="status-actions">
          <Link href="/dashboard" className="btn btn-primary">Go to your workflows</Link>
          <Link href="/" className="btn btn-secondary">Homepage</Link>
        </div>
      </div>
    </main>
  );
}
