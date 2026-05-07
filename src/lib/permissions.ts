import { Role } from '../types';

export const PERMISSIONS = {
  view_hotel_management: ['super_admin', 'hr_director'] as Role[],
  edit_hotel_management: ['super_admin'] as Role[],
  
  view_room_management: ['super_admin', 'hr_director', 'facility_manager'] as Role[],
  edit_room_management: ['super_admin', 'facility_manager'] as Role[],
  
  view_staff_management: ['super_admin', 'hr_director', 'hotel_hr_manager', 'facility_manager'] as Role[],
  add_staff_request: ['super_admin', 'hotel_hr_manager'] as Role[],
  place_staff: ['super_admin', 'facility_manager'] as Role[],
  checkout_staff: ['super_admin', 'facility_manager'] as Role[],
  
  view_maintenance: ['super_admin', 'hr_director', 'facility_manager'] as Role[],
  manage_maintenance: ['super_admin', 'facility_manager'] as Role[],
  
  view_settings: ['super_admin'] as Role[],
};

export function hasPermission(userRole: Role | undefined, allowedRoles: Role[]) {
  if (!userRole || !allowedRoles) return false;
  return allowedRoles.includes(userRole);
}
