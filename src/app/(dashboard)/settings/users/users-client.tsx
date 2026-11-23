'use client';

import { Ur } from '@/components/ui/urdu';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, Plus, Shield, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ShopUser } from '@/lib/types';
import { addStaffMember, updateStaffRole, toggleStaffStatus, resetStaffPassword } from '../actions';

interface UsersClientProps {
  staffMembers: (ShopUser & {
    profile?: {
      full_name: string;
      email: string;
      phone: string | null;
    } | null;
  })[];
  currentUserId: string;
}

export function UsersClient({ staffMembers, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await addStaffMember(formData);
      if (res.error) {
        setFormError(res.error);
      } else {
        setIsAddOpen(false);
        toast.success('Staff member added. Give them their email and password to log in.');
        router.refresh();
      }
    });
  }

  function handleResetPassword(shopUserId: string, name: string) {
    const newPassword = window.prompt(`New password for ${name} (at least 8 characters):`);
    if (!newPassword) return;
    startTransition(async () => {
      const res = await resetStaffPassword(shopUserId, newPassword);
      if (res.error) toast.error(res.error);
      else toast.success(`Password changed for ${name}.`);
    });
  }

  async function handleRoleChange(shopUserId: string, newRole: 'manager' | 'cashier') {
    startTransition(async () => {
      const res = await updateStaffRole(shopUserId, newRole);
      if (res.error) {
        toast.error(res.error);
      }
      router.refresh();
    });
  }

  async function handleToggleStatus(shopUserId: string, currentStatus: boolean) {
    startTransition(async () => {
      const res = await toggleStaffStatus(shopUserId, !currentStatus);
      if (res.error) {
        toast.error(res.error);
      }
      router.refresh();
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Settings Navigation Tabs */}
      <div className="flex gap-4 border-b border-border pb-1">
        <Link
          href="/settings"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Shop Profile
        </Link>
        <Link
          href="/settings/preferences"
          className="border-b-2 border-transparent pb-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          POS & Invoice Preferences
        </Link>
        <Link
          href="/settings/users"
          className="border-b-2 border-primary pb-2 text-sm font-semibold text-primary"
        >
          Staff & Roles
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Staff <Ur className="text-lg text-muted-foreground">ملازمین</Ur></h1>
          <p className="text-xs text-muted-foreground">
            Control employee roles (Manager, Cashier), manage permissions, and assign access.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff Member</th>
                <th className="px-4 py-3 font-semibold">Contact Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {staffMembers.map((member) => {
                const isOwner = member.role === 'shop_owner';
                const isSelf = member.user_id === currentUserId;

                return (
                  <tr key={member.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-foreground">
                        {member.profile?.full_name || 'Staff User'}
                        {isSelf && (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                      {member.profile?.email || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <Shield className="h-3.5 w-3.5" /> Shop Owner
                        </span>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value as 'manager' | 'cashier')
                          }
                          disabled={isPending}
                          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                        >
                          <option value="manager">Manager</option>
                          <option value="cashier">Cashier</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {!isOwner && !isSelf && (
                        <div className="inline-flex items-center gap-1">
                        <button
                          disabled={isPending}
                          onClick={() => handleResetPassword(member.id, member.profile?.full_name || 'staff')}
                          className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                          title="Change password"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Password
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => handleToggleStatus(member.id, member.is_active)}
                          className={`rounded px-2.5 py-1 text-xs font-semibold ${
                            member.is_active
                              ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                              : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-sm text-foreground">Add Staff Member</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name / پورا نام *</label>
                <input
                  type="text"
                  name="full_name"
                  required
                  placeholder="e.g. Bilal Ahmed"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Login Email / ای میل *</label>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="off"
                  placeholder="e.g. bilal.shop@gmail.com"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Password / پاس ورڈ *</label>
                <input
                  type="text"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm font-mono focus:border-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Write this down and give it to the staff member. They log in with this email and password.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Phone / فون</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="03001234567"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Role *</label>
                <select
                  name="role"
                  defaultValue="cashier"
                  className="w-full rounded border border-border bg-background p-2 focus:border-primary focus:outline-none"
                >
                  <option value="cashier">Cashier (POS & Sales only)</option>
                  <option value="manager">Manager (Inventory, Purchases, Reports)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded bg-primary px-3 py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {isPending ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
