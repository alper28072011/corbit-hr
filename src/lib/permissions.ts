import { Role, RoleConfig } from '../types';

export const PERMISSION_KEYS = {
  view_hotel_management: 'view_hotel_management',
  edit_hotel_management: 'edit_hotel_management',
  
  view_room_management: 'view_room_management',
  edit_room_management: 'edit_room_management',
  
  view_staff_management: 'view_staff_management',
  add_staff_request: 'add_staff_request',
  place_staff: 'place_staff',
  checkout_staff: 'checkout_staff',
  edit_staff: 'edit_staff',
  delete_staff: 'delete_staff',
  
  view_maintenance: 'view_maintenance',
  manage_maintenance: 'manage_maintenance',
  
  view_settings: 'view_settings',
} as const;

export type PermissionKey = keyof typeof PERMISSION_KEYS;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  super_admin: Object.values(PERMISSION_KEYS) as PermissionKey[],
  hr_director: ['view_hotel_management', 'view_room_management', 'view_staff_management', 'view_maintenance'],
  hotel_hr_manager: ['view_staff_management', 'add_staff_request'],
  facility_manager: ['view_room_management', 'edit_room_management', 'view_staff_management', 'place_staff', 'checkout_staff', 'view_maintenance', 'manage_maintenance']
};

export function hasPermission(userRole: Role | undefined, permissionKey: string | string[], rolesConfig?: RoleConfig[]): boolean {
  if (!userRole) return false;
  if (userRole === 'super_admin') return true;

  const roleConfig = rolesConfig?.find(r => r.key === userRole);
  
  let userPermissions: string[] = [];
  if (roleConfig && roleConfig.permissions) {
    userPermissions = roleConfig.permissions;
  } else {
    // Fallback to default if not configured
    userPermissions = DEFAULT_ROLE_PERMISSIONS[userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS] || [];
  }

  if (Array.isArray(permissionKey)) {
    return permissionKey.some(key => userPermissions.includes(key));
  }
  return userPermissions.includes(permissionKey);
}
