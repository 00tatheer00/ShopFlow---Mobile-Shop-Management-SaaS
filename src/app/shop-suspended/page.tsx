import Link from 'next/link';
import { AlertOctagon } from 'lucide-react';

export default function ShopSuspendedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
          <AlertOctagon className="h-7 w-7 text-warning" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Shop Suspended</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your shop account has been suspended. Please contact the platform administrator for assistance.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-accent transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
