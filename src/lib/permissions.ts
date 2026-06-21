import { Role, RolePermissions, PagePermission } from '../types';

export const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Süper Admin',
  hr_director: 'İK Direktörü',
  hotel_hr_manager: 'Otel İK Yöneticisi',
  facility_manager: 'Lojman Sorumlusu'
};

export const PERMISSIONS_MATRIX: PagePermission[] = [
  {
    pageKey: 'dashboard',
    pageName: 'Dashboard (Ana Ekran)',
    features: []
  },
  {
    pageKey: 'staff',
    pageName: 'Personel Yönetimi',
    features: [
      { key: 'create_staff', name: 'Personel Ekle', description: 'Yeni personel kaydı oluşturabilir.' },
      { key: 'edit_staff', name: 'Personel Düzenle', description: 'Personel bilgilerini düzenleyebilir.' },
      { key: 'delete_staff', name: 'Personel Sil', description: 'Personeli veritabanından tamamen silebilir.' },
      { key: 'change_room', name: 'Oda - Yerleşim Değiştir', description: 'Personelin odasını değiştirebilir (Room Change).' },
      { key: 'approve_exceptions', name: 'İstisna Onaylama', description: 'Çapraz lojman yerleşimi ve Aile odası gibi istisnai durumları onaylama veya doğrudan uygulama yetkisi.' },
      { key: 'view_sensitive_info', name: 'Hassas Verileri Gör', description: 'Tooltip ile TC ve Telefon numarası gibi hassas verileri görebilir.' }
    ]
  },
  {
    pageKey: 'rooms',
    pageName: 'Oda Yönetimi',
    features: [
      { key: 'add_room', name: 'Oda Ekle', description: 'Tekli veya Excel ile içe aktararak yeni oda tanımlayabilir.' },
      { key: 'edit_room', name: 'Oda Düzenle', description: 'Oda özelliklerini, blok/kat ve cinsiyet kilitlerini değiştirebilir.' }
    ]
  },
  {
    pageKey: 'maintenance',
    pageName: 'Arıza ve Bakım',
    features: [
      { key: 'create_ticket', name: 'Kayıt Aç', description: 'Yeni arıza kaydı açabilir.' },
      { key: 'update_ticket_status', name: 'Durum Değiştir', description: 'Arıza durumunu (Açık, İşlemde, Kapalı) değiştirebilir.' },
      { key: 'edit_ticket', name: 'Kayıt Düzenle', description: 'Kayıt içeriğini değiştirebilir.' },
      { key: 'delete_ticket', name: 'Kayıt Sil', description: 'Arıza kaydını silebilir.' }
    ]
  },
  {
    pageKey: 'facilities',
    pageName: 'Tesis Yönetimi',
    features: [
      { key: 'edit_facilities', name: 'Tesis Düzenle', description: 'Tesis ekleme, silme, düzenleme yapabilir.' }
    ]
  },
  {
    pageKey: 'rack',
    pageName: 'Oda Doluluk (Rack)',
    features: []
  },
  {
    pageKey: 'settings',
    pageName: 'Ayarlar ve Sistem',
    features: [
      { key: 'view_logs', name: 'Sistem Logları', description: 'Kullanıcı hareketlerini (Action Logs) görebilir.' }
    ]
  },
  {
    pageKey: 'feedback',
    pageName: 'Destek & Geribildirim',
    features: []
  }
];

export const PAGE_KEYS = {
  dashboard: 'dashboard',
  facilities: 'facilities',
  rooms: 'rooms',
  rack: 'rack',
  staff: 'staff',
  maintenance: 'maintenance',
  settings: 'settings',
  feedback: 'feedback',
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
