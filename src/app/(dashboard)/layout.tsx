import { getAuthUser } from '@/lib/auth';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();

  // Super admins should go to /admin
  if (user.role === 'super_admin') {
    const { redirect } = await import('next/navigation');
    redirect('/admin');
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
