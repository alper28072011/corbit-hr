import { Role, RolePermissions } from '../types';

export const PAGE_KEYS = {
  dashboard: 'dashboard',
  facilities: 'facilities',
  rooms: 'rooms',
  rack: 'rack',
  staff: 'staff',
  maintenance: 'maintenance',
  settings: 'settings',
} as const;

export function canViewPage(userRole: Role | undefined, pageKey: string, rolesPermissions: RolePermissions[]): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;

  const rolePerms = rolesPermissions.find(r => r.roleKey === userRole);
  if (!rolePerms) return false;

  return rolePerms.allowedPages.includes(pageKey);
}

export function can(userRole: Role | undefined, featureKey: string, pageKey: string, rolesPermissions: RolePermissions[]): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;

  const rolePerms = rolesPermissions.find(r => r.roleKey === userRole);
  if (!rolePerms) return false;

  // Fonksiyon Kuralı: Sayfa izni yoksa fonksiyon izni doğrudan false
  if (!rolePerms.allowedPages.includes(pageKey)) return false;

  return rolePerms.allowedFeatures.includes(featureKey);
}
