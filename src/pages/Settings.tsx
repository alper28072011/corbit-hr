import { useState } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, Check } from "lucide-react";
import { useStore } from "../store/useStore";
import { Role } from "../types";
import { PERMISSION_KEYS, PERMISSION_LABELS, PermissionKey } from "../lib/permissions";

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Süper Admin',
  hr_director: 'İK Direktörü',
  hotel_hr_manager: 'Otel İK Yöneticisi',
  facility_manager: 'Lojman Sorumlusu'
};

export default function Settings() {
  const { users, roles, currentUser, addUser, updateUser, deleteUser, hotels, facilities, addRole, updateRole, deleteRole } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const [roleFormData, setRoleFormData] = useState({
    name: '',
    key: ''
  });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'hotel_hr_manager',
    assignedHotelId: '',
    assignedFacilityId: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Security check
  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok. Sadece Süper Adminler erişebilir.</p>
      </div>
    );
  }

  const handleSubmit = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    if (editingUser) {
      updateUser(editingUser, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        assignedHotelId: formData.role === 'hotel_hr_manager' ? formData.assignedHotelId : undefined,
        assignedFacilityId: formData.role === 'facility_manager' ? formData.assignedFacilityId : undefined,
        status: formData.status
      });
    } else {
      addUser({
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        assignedHotelId: formData.role === 'hotel_hr_manager' ? formData.assignedHotelId : undefined,
        assignedFacilityId: formData.role === 'facility_manager' ? formData.assignedFacilityId : undefined,
        status: formData.status
      });
    }
    closeForm();
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ fullName: '', email: '', role: 'hotel_hr_manager', assignedHotelId: '', assignedFacilityId: '', status: 'active' });
  };

  const startEdit = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedHotelId: user.assignedHotelId || '',
      assignedFacilityId: user.assignedFacilityId || '',
      status: user.status || 'active'
    });
    setEditingUser(userId);
    setShowAddForm(true);
  };

  const handleRoleSubmit = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!roleFormData.name || !roleFormData.key) return;

    if (editingRole) {
      updateRole(editingRole, {
        name: roleFormData.name,
        key: roleFormData.key
      });
    } else {
      addRole({
        name: roleFormData.name,
        key: roleFormData.key,
        permissions: [] // default empty
      });
    }
    closeRoleForm();
  };

  const closeRoleForm = () => {
    setShowRoleForm(false);
    setEditingRole(null);
    setRoleFormData({ name: '', key: '' });
  };

  const startEditRole = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    setRoleFormData({
      name: role.name,
      key: role.key
    });
    setEditingRole(roleId);
    setShowRoleForm(true);
  };

  const handlePermissionToggle = (roleId: string, permission: string, currentPermissions: string[] = []) => {
    const newPermissions = currentPermissions.includes(permission)
      ? currentPermissions.filter(p => p !== permission)
      : [...currentPermissions, permission];
      
    updateRole(roleId, { permissions: newPermissions });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#2D332D]">Ayarlar</h1>
          <p className="text-stone-500 mt-1">Sistem kullanıcıları ve yetkilerini yönetin.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-[#E8E6E1]">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'users' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Kullanıcı Yönetimi
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'roles' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600"}`}
        >
          Rol Yetkileri (Matris)
        </button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Kullanıcı
            </button>
          </div>

      {showAddForm && (
        <div className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm mb-8">
          <h3 className="text-lg font-bold mb-4">{editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Ad Soyad</label>
              <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">E-posta</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Rol</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]">
                {roles.length > 0 ? (
                  roles.map((role) => (
                    <option key={role.id} value={role.key}>{role.name}</option>
                  ))
                ) : (
                  Object.entries(ROLE_NAMES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))
                )}
              </select>
            </div>

            {formData.role === 'hotel_hr_manager' && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Sorumlu Olduğu Otel</label>
                <select required value={formData.assignedHotelId} onChange={e => setFormData({...formData, assignedHotelId: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]">
                  <option value="">Otel Seçin...</option>
                  {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            )}

            {formData.role === 'facility_manager' && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Sorumlu Olduğu Lojman</label>
                <select required value={formData.assignedFacilityId} onChange={e => setFormData({...formData, assignedFacilityId: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]">
                  <option value="">Lojman Seçin...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Durum</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]">
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl text-stone-600 font-semibold transition-colors">İptal</button>
              <button type="submit" className="px-4 py-2 bg-[#2D332D] hover:bg-black text-white rounded-xl font-semibold transition-colors">Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E8E6E1] uppercase text-xs text-stone-400">
                <th className="pb-4 font-semibold">Kullanıcı</th>
                <th className="pb-4 font-semibold">Durum</th>
                <th className="pb-4 font-semibold">Rol</th>
                <th className="pb-4 font-semibold">Sorumluluk Alanı</th>
                <th className="pb-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-4">
                    <p className="font-bold text-[#2D332D]">{user.fullName}</p>
                    <p className="text-stone-500 text-xs mt-0.5">{user.email}</p>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-[11px] font-bold ${user.status === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {user.status === 'inactive' ? 'Pasif' : 'Aktif'}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-stone-600">
                    {roles.length > 0 ? roles.find(r => r.key === user.role)?.name || user.role : ROLE_NAMES[user.role] || user.role}
                  </td>
                  <td className="py-4 text-stone-500">
                    {user.role === 'hotel_hr_manager' ? hotels.find(h => h.id === user.assignedHotelId)?.name || '-' : ''}
                    {user.role === 'facility_manager' ? facilities.find(f => f.id === user.assignedFacilityId)?.name || '-' : ''}
                    {['super_admin', 'hr_director'].includes(user.role) ? 'Tüm Tesisler' : ''}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                       {user.id !== currentUser.id && (
                         <button onClick={() => { if(confirm('Silmek istediğinize emin misiniz?')) deleteUser(user.id); }} className="p-2 hover:bg-red-50 rounded-lg text-red-400 transition-colors" title="Sil">
                           <Trash2 className="w-4 h-4" />
                         </button>
                       )}
                      <button onClick={() => startEdit(user.id)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-600 transition-colors" title="Düzenle">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500 italic">Hiç kullanıcı bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === 'roles' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-stone-500">Rollerin yetki matrisini detaylı şekilde düzenleyebilirsiniz. "Süper Admin" rolünün tüm yetkileri varsayılan olarak açıktır.</p>
            <button 
              onClick={() => setShowRoleForm(!showRoleForm)}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Rol
            </button>
          </div>

          {showRoleForm && (
            <div className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm mb-8 relative">
              <h3 className="text-lg font-bold mb-4">{editingRole ? 'Rol Düzenle' : 'Yeni Rol Ekle'}</h3>
              <form onSubmit={handleRoleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Rol Adı (Görünür)</label>
                  <input required type="text" value={roleFormData.name} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]" placeholder="Örn: İK Yöneticisi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Rol Anahtarı (Kod, boşluksuz)</label>
                  <input required type="text" value={roleFormData.key} onChange={e => setRoleFormData({...roleFormData, key: e.target.value})} className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363]" placeholder="Örn: ik_yoneticisi" disabled={!!editingRole} />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" onClick={closeRoleForm} className="px-4 py-2 border border-stone-200 hover:bg-stone-50 rounded-xl text-stone-600 font-semibold transition-colors">İptal</button>
                  <button type="submit" className="px-4 py-2 bg-[#2D332D] hover:bg-black text-white rounded-xl font-semibold transition-colors">Kaydet</button>
                </div>
              </form>
              
              {editingRole && roles.length > 1 && (
                <button type="button" onClick={() => { if(confirm('Simek istediğinize emin misiniz? Bu role sahip kullanıcılar sisteme erişemeyebilir.')) deleteRole(editingRole); closeRoleForm(); }} className="absolute top-6 right-6 text-red-500 hover:text-red-700 font-semibold text-sm flex items-center gap-1">
                  <Trash2 className="w-4 h-4" /> Rolü Sil
                </button>
              )}
            </div>
          )}

          <div className="bg-white rounded-[32px] border border-[#E8E6E1] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b uppercase text-xs text-stone-500 bg-[#FDFCFB]">
                    <th className="py-4 px-6 font-semibold sticky left-0 bg-[#FDFCFB] z-10 border-r border-[#E8E6E1]">Yetki Modülü / Açıklama</th>
                    {roles.map(role => (
                      <th key={role.id} className="py-4 px-6 font-semibold text-center min-w-[140px] whitespace-nowrap">
                         <div className="flex flex-col items-center gap-1">
                           <span className="text-[#2D332D]">{role.name}</span>
                           <button onClick={() => startEditRole(role.id)} className="text-[10px] text-stone-400 hover:text-stone-600 normal-case tracking-normal">Ayarla</button>
                         </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {Object.entries(PERMISSION_LABELS).map(([permKey, label]) => (
                    <tr key={permKey} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-stone-700 sticky left-0 bg-white group-hover:bg-stone-50/50 border-r border-stone-100 z-10">
                         {label}
                         <div className="text-[10px] text-stone-400 font-normal mt-0.5 font-mono">{permKey}</div>
                      </td>
                      {roles.map(role => {
                         const isSuperAdmin = role.key === 'super_admin';
                         const hasPerm = isSuperAdmin || (role.permissions || []).includes(permKey as PermissionKey);
                         return (
                           <td key={role.id} className="py-4 px-6 text-center">
                              <label className={`inline-flex items-center justify-center p-2 rounded-lg cursor-pointer transition-colors ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-100'}`}>
                                <input 
                                  type="checkbox" 
                                  className="sr-only" 
                                  checked={hasPerm}
                                  disabled={isSuperAdmin}
                                  onChange={() => handlePermissionToggle(role.id, permKey, role.permissions)} 
                                />
                                <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${hasPerm ? 'bg-[#7C8363] border-[#7C8363] text-white' : 'bg-white border-stone-300'}`}>
                                  {hasPerm && <Check className="w-4 h-4" />}
                                </div>
                              </label>
                           </td>
                         )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {roles.length === 0 && (
              <div className="p-12 text-center text-stone-500 italic border-t border-stone-100">
                Rolleri dinamik olarak düzenleyebilmek için lütfen Firestore tarafında roles kayıtlarının yüklendiğinden emin olun.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
