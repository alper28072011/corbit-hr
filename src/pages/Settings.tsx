import { useState } from "react";
import { Plus, Edit2, Trash2, ShieldAlert } from "lucide-react";
import { useStore } from "../store/useStore";
import { Role } from "../types";

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
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
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
        key: roleFormData.key
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

  return (
    <div className="space-y-8 pb-8">
      <div className="flex justify-between items-end border-b border-[#E8E6E1] pb-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#2D332D]">Ayarlar</h2>
          <p className="text-stone-500 mt-1">Kullanıcılar ve Roller</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('users')} className={`px-4 py-2 font-semibold text-sm rounded ${activeTab === 'users' ? 'bg-[#7C8363] text-white' : 'bg-stone-100'}`}>Kullanıcılar</button>
           <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 font-semibold text-sm rounded ${activeTab === 'roles' ? 'bg-[#7C8363] text-white' : 'bg-stone-100'}`}>Roller</button>
        </div>
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
              <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full border px-3 py-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">E-posta</label>
              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border px-3 py-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Rol</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border px-3 py-2 rounded-lg">
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
                <select required value={formData.assignedHotelId} onChange={e => setFormData({...formData, assignedHotelId: e.target.value})} className="w-full border px-3 py-2 rounded-lg">
                  <option value="">Otel Seçin...</option>
                  {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            )}

            {formData.role === 'facility_manager' && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Sorumlu Olduğu Lojman</label>
                <select required value={formData.assignedFacilityId} onChange={e => setFormData({...formData, assignedFacilityId: e.target.value})} className="w-full border px-3 py-2 rounded-lg">
                  <option value="">Lojman Seçin...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}

              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Durum</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})} className="w-full border px-3 py-2 rounded-lg">
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
              <button type="button" onClick={closeForm} className="px-4 py-2 border rounded-xl text-stone-600 font-semibold">İptal</button>
              <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded-xl font-semibold">Kaydet</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b uppercase text-xs text-stone-400">
                <th className="pb-4 font-semibold">Kullanıcı</th>
                <th className="pb-4 font-semibold">Durum</th>
                <th className="pb-4 font-semibold">Rol</th>
                <th className="pb-4 font-semibold">Sorumluluk Alanı</th>
                <th className="pb-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm">
              {users.map(user => (
                <tr key={user.id}>
                  <td className="py-4">
                    <p className="font-bold text-[#2D332D]">{user.fullName}</p>
                    <p className="text-stone-500">{user.email}</p>
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${user.status === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {user.status === 'inactive' ? 'Pasif' : 'Aktif'}
                    </span>
                  </td>
                  <td className="py-4 font-semibold text-stone-600">
                    {roles.length > 0 ? roles.find(r => r.key === user.role)?.name || user.role : ROLE_NAMES[user.role] || user.role}
                  </td>
                  <td className="py-4 text-stone-500">
                    {user.role === 'hotel_hr_manager' ? hotels.find(h => h.id === user.assignedHotelId)?.name : ''}
                    {user.role === 'facility_manager' ? facilities.find(f => f.id === user.assignedFacilityId)?.name : ''}
                    {['super_admin', 'hr_director'].includes(user.role) ? 'Tüm Tesisler' : ''}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(user.id)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === 'roles' && (
        <>
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => setShowRoleForm(true)}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Rol
            </button>
          </div>

          {showRoleForm && (
            <div className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm mb-8">
              <h3 className="text-lg font-bold mb-4">{editingRole ? 'Rol Düzenle' : 'Yeni Rol Ekle'}</h3>
              <form onSubmit={handleRoleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Rol Adı (Görünür)</label>
                  <input required type="text" value={roleFormData.name} onChange={e => setRoleFormData({...roleFormData, name: e.target.value})} className="w-full border px-3 py-2 rounded-lg" placeholder="Örn: İK Yöneticisi" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Rol Anahtarı (Kod, boşluksuz)</label>
                  <input required type="text" value={roleFormData.key} onChange={e => setRoleFormData({...roleFormData, key: e.target.value})} className="w-full border px-3 py-2 rounded-lg" placeholder="Örn: ik_yoneticisi" />
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                  <button type="button" onClick={closeRoleForm} className="px-4 py-2 border rounded-xl text-stone-600 font-semibold">İptal</button>
                  <button type="submit" className="px-4 py-2 bg-stone-900 text-white rounded-xl font-semibold">Kaydet</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b uppercase text-xs text-stone-400">
                    <th className="pb-4 font-semibold">Rol Adı</th>
                    <th className="pb-4 font-semibold">Anahtar (Key)</th>
                    <th className="pb-4 font-semibold text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm">
                  {roles.map(role => (
                    <tr key={role.id}>
                      <td className="py-4 font-bold text-[#2D332D]">{role.name}</td>
                      <td className="py-4 text-stone-500">{role.key}</td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => startEditRole(role.id)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-600">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { if(confirm('Silmek istediğinize emin misiniz?')) deleteRole(role.id); }} className="p-2 hover:bg-red-50 rounded-lg text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {roles.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-stone-500 italic">
                        Henüz dinamik rol eklenmemiş. Sistemde yerleşik roller kullanılmaktadır.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
