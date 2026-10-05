import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  ShieldCheck,
  Calendar,
  Layers,
  Database,
  Server,
  Activity,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Platform Audit & Settings',
};

export default async function AdminSettingsPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  // Fetch recent platform audit logs
  const { data: rawLogs } = await supabase
    .from('audit_logs')
    .select(`
      id, shop_id, user_id, action, entity_type, entity_id, metadata, ip_address, created_at,
      shops(name, display_shop_id),
      profiles:user_id(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(30);

  interface RawAuditLog {
    id: string;
    shop_id: string | null;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata?: { reason?: string; type?: string; [key: string]: unknown } | null;
    ip_address?: string | null;
    created_at: string;
    shops?: { name: string; display_shop_id: string | null } | null;
    profiles?: { full_name: string; email: string } | null;
  }

  const logs = (rawLogs || []) as unknown as RawAuditLog[];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Platform Audit & Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Immutable audit trails of administrative events, plan metadata, and infrastructure health.
        </p>
      </div>

      {/* System Infrastructure Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 border-b border-border pb-3">
          <Server className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Infrastructure & Environment</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-primary" />
              Database Engine
            </span>
            <p className="font-bold text-sm text-foreground">PostgreSQL 15+ (Supabase)</p>
            <p className="text-[11px] text-muted-foreground">Row Level Security (RLS) Active</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              Application Architecture
            </span>
            <p className="font-bold text-sm text-foreground">Next.js 16 + React 19</p>
            <p className="text-[11px] text-muted-foreground">Turbopack, Server Actions</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              Tenant Model
            </span>
            <p className="font-bold text-sm text-foreground">Multi-Tenant (Shared Schema)</p>
            <p className="text-[11px] text-muted-foreground">Strict Shop ID Isolation</p>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-foreground">Platform Audit Log</h2>
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            Showing latest {logs.length} events
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground">
            No platform activity logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Shop</th>
                  <th className="py-3 px-4">Performed By</th>
                  <th className="py-3 px-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const actionName = log.action.replace(/_/g, ' ').toUpperCase();
                  const target =
                    log.shops?.display_shop_id || log.shops?.name || log.entity_type || 'Platform';
                  const adminName =
                    log.profiles?.full_name || log.profiles?.email || 'Platform Admin';

                  return (
                    <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 px-5 text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold font-mono text-foreground border border-border">
                          {actionName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-xs text-foreground">
                        {target}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{adminName}</span>
                      </td>
                      <td className="py-3.5 px-5 text-right text-xs text-muted-foreground font-mono">
                        {log.metadata?.reason ? (
                          <span className="italic">&ldquo;{log.metadata.reason}&rdquo;</span>
                        ) : log.metadata?.type ? (
                          <span>{log.metadata.type}</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
