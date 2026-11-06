import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogOut, Shield } from 'lucide-react';
import { logoutAction } from '@/app/(auth)/actions';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your current account does not have permission to view this page. This usually happens if you are logged in as a shopkeeper trying to open the Super Admin portal, or as a Super Admin opening a shop terminal without an assigned shop.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            <span>Shop Dashboard</span>
          </Link>
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <Shield className="h-4 w-4 text-primary" />
            <span>Super Admin</span>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-center">
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out and switch account</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
