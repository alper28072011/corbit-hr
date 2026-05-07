export interface Hotel {
  id: string;
  name: string;
  status: 'active' | 'passive';
}

export interface Facility {
  id: string;
  name: string;
  hotelId: string;
  capacity: number;
  status: 'active' | 'passive';
}

export type GenderType = 'male' | 'female' | 'mixed';
export type RoomStatus = 'active' | 'passive' | 'maintenance';

export type Role = string;

export interface RoleConfig {
  id: string;
  name: string;
  key: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  assignedHotelId?: string;
  assignedFacilityId?: string;
  status?: 'active' | 'inactive';
}

export interface Room {
  id: string;
  facilityId: string;
  roomNumber: string;
  bedCount: number;
  genderType: GenderType;
  status: RoomStatus;
}

export interface Staff {
  id: string;
  fullName: string;
  tcNo: string;
  phone: string;
  department: string;
  position: string;
  hotelId: string;
  gender: 'male' | 'female';
  status: 'pending_placement' | 'placed' | 'left';
}

export interface Accommodation {
  id: string;
  staffId: string;
  facilityId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate?: string;
  status: 'active' | 'checked_out';
}

export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved';

export interface MaintenanceRequest {
  id: string;
  facilityId: string;
  roomId?: string; // Optional for common areas
  reporterName: string;
  description: string;
  createdAt: string;
  status: MaintenanceStatus;
  resolvedAt?: string;
}
