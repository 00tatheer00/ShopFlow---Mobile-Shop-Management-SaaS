import type { Metadata } from 'next';
import { requireSuperAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = {
  title: {
    template: '%s | ShopFlow Super Admin',
    default: 'Super Admin Portal | ShopFlow',
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Strict server-side RBAC: Only super_admin role can proceed
  const user = await requireSuperAdmin();

  return <AdminShell user={user}>{children}</AdminShell>;
}
