export interface Hotel {
  id: string;
  name: string;
  status: 'active' | 'passive';
}

export interface Facility {
  id: string;
  name: string;
  allowedHotelIds: string[];
  roomCapacity: number;
  bedCapacity: number;
  status: 'active' | 'passive';
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
}

export type GenderType = 'male' | 'female' | 'mixed' | 'Aile';
export type RoomStatus = 'active' | 'passive' | 'maintenance';

export type Role = string;

export interface RoleConfig {
  id: string;
  name: string;
  key: string;
  permissions?: string[];
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  assignedHotelIds?: string[];
  assignedFacilityIds?: string[];
  assignedHotelId?: string;
  assignedFacilityId?: string;
  status?: 'active' | 'inactive';
  phone?: string;
  avatarUrl?: string;
  createdAt?: number;
}

export interface FeaturePermission {
  key: string;       // Fonksiyon/Aksiyon anahtarı (Örn: 'change_room')
  name: string;      // Kullanıcı dostu adı
  description: string; // Ne işe yaradığını açıklayan tek cümle
}

export interface PagePermission {
  pageKey: string;   // Sayfa anahtarı (Örn: 'staff', 'rooms', 'maintenance')
  pageName: string;  // Sayfa başlığı
  features: FeaturePermission[]; // O sayfanın altındaki kritik fonksiyonlar
}

export interface RolePermissions {
  id?: string;
  roleKey: string;   // 'ik_muduru', 'lojman_sorumlusu' vb.
  allowedPages: string[]; // İzin verilen sayfa key'leri
  allowedFeatures: string[]; // İzin verilen fonksiyon key'leri
}

export interface Room {
  id: string;
  facilityId: string;
  roomNumber: string;
  block?: string;
  floor?: string;
  bedCount: number;
  genderType: GenderType;
  status: RoomStatus;
  notes?: string;
}

export interface Staff {
  id: string;
  fullName: string;
  tcNo: string;
  phone: string;
  birthDate?: string;
  department: string;
  position: string;
  hotelId: string;
  gender: 'male' | 'female';
  status: 'pending_placement' | 'placed' | 'left' | 'pending_approval';
  notes?: string;
  specialNote?: string;
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

export interface ActionLog {
  id: string;
  entityId: string;
  entityType: 'staff' | 'room' | 'facility' | 'maintenance';
  action: 'create' | 'update' | 'delete' | 'check_in' | 'check_out' | 'room_change';
  changes: string;
  performedBy: string;
  timestamp: number;
}

export interface ApprovalRequest {
  id: string;
  staffId: string;
  targetRoomId: string;
  sourceRoomId?: string; // Eklenen alan
  requestType: 'check_in' | 'room_change' | 'dorm_change' | 'family_placement' | 'cross_dorm_placement';
  requestedBy: string; // Lojman görevlisinin ID/E-posta
  status: 'Bekliyor' | 'Onaylandı' | 'Reddedildi';
  createdAt: number;
  note: string; // Örn: "A Otelinden X kişisi ile evli, Aile odası talebi."
}

export interface MaintenanceTicket {
  id: string;
  title: string;
  description: string;
  hotelId: string;
  dormId: string;
  roomId?: string;
  status: 'Açık' | 'İşlemde' | 'Kapalı' | 'İptal Edildi';
  reportedBy: string;
  createdAt: number;
  resolvedAt?: number;
  priority: 'Düşük' | 'Orta' | 'Acil';
}
