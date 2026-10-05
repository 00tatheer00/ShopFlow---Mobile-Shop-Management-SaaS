import type { UserRole } from '@/lib/types';

/**
 * Check if user has a specific permission based on role.
 * Safe to import in both Client and Server Components.
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    super_admin: ['*'],
    shop_owner: [
      'dashboard:view', 'dashboard:profit',
      'products:create', 'products:edit', 'products:delete', 'products:view',
      'categories:manage', 'brands:manage',
      'inventory:view', 'inventory:adjust',
      'imei:view', 'imei:search',
      'purchases:create', 'purchases:view',
      'sales:create', 'sales:view', 'sales:cancel',
      'customers:create', 'customers:edit', 'customers:delete', 'customers:view',
      'suppliers:create', 'suppliers:edit', 'suppliers:view',
      'udhaar:view', 'udhaar:payment',
      'expenses:create', 'expenses:view',
      'reports:view',
      'settings:manage',
      'users:manage',
      'audit:view',
    ],
    manager: [
      'dashboard:view',
      'products:create', 'products:edit', 'products:view',
      'categories:manage', 'brands:manage',
      'inventory:view', 'inventory:adjust',
      'imei:view', 'imei:search',
      'purchases:create', 'purchases:view',
      'sales:create', 'sales:view',
      'customers:create', 'customers:edit', 'customers:view',
      'suppliers:create', 'suppliers:edit', 'suppliers:view',
      'udhaar:view', 'udhaar:payment',
      'expenses:create', 'expenses:view',
    ],
    cashier: [
      'dashboard:view',
      'products:view',
      'inventory:view',
      'imei:view', 'imei:search',
      'sales:create', 'sales:view:own',
      'customers:create', 'customers:edit', 'customers:view',
      'udhaar:view', 'udhaar:payment',
    ],
  };

  const userPermissions = permissions[role];
  if (!userPermissions) return false;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(permission);
}
