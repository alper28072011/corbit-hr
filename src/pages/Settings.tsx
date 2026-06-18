import React, { useState } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, Check, X, Shield, Lock, LayoutGrid, Users, Wrench } from "lucide-react";
import { useStore } from "../store/useStore";
import { PagePermission } from "../types";
import { canViewPage, PAGE_KEYS, ROLE_NAMES, PERMISSIONS_MATRIX } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function Settings() {
  const { users, rolesPermissions, currentUser, addUser, updateUser, deleteUser, hotels, facilities, updateRolePermissions } = useStore();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    role: string;
    assignedHotelIds: string[];
    assignedFacilityIds: string[];
    status: 'active' | 'inactive';
  }>({
    fullName: '',
    email: '',
    role: 'hotel_hr_manager',
    assignedHotelIds: [],
    assignedFacilityIds: [],
    status: 'active'
  });

  const [selectedRole, setSelectedRole] = useState<string>('hr_director');

  // Security check
  if (!canViewPage(currentUser?.role, PAGE_KEYS.settings, rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok. Yönetici ile iletişime geçin.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    if (editingUser) {
      updateUser(editingUser, formData);
    } else {
      addUser(formData);
    }
    closeForm();
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({ fullName: '', email: '', role: 'hotel_hr_manager', assignedHotelIds: [], assignedFacilityIds: [], status: 'active' });
  };

  const startEdit = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedHotelIds: user.assignedHotelIds || [],
      assignedFacilityIds: user.assignedFacilityIds || [],
      status: user.status || 'active'
    });
    setEditingUser(userId);
    setShowAddForm(true);
  };

  const handleRolePermissionChange = async (roleKey: string, pageKey: string, featureKey?: string) => {
    if (roleKey === 'super_admin') return; // Cannot edit super_admin

    const currentPerm = rolesPermissions.find(r => r.roleKey === roleKey) || {
      roleKey, allowedPages: [], allowedFeatures: []
    };

    let newPages = [...currentPerm.allowedPages];
    let newFeatures = [...currentPerm.allowedFeatures];

    if (!featureKey) {
      // Toggle Page
      if (newPages.includes(pageKey)) {
        newPages = newPages.filter(p => p !== pageKey);
        // Remove all features of this page too
        const pageFeatures = PERMISSIONS_MATRIX.find(p => p.pageKey === pageKey)?.features.map(f => f.key) || [];
        newFeatures = newFeatures.filter(f => !pageFeatures.includes(f));
      } else {
        newPages.push(pageKey);
      }
    } else {
      // Toggle Feature
      if (newFeatures.includes(featureKey)) {
        newFeatures = newFeatures.filter(f => f !== featureKey);
      } else {
        newFeatures.push(featureKey);
        // Ensure page is enabled if a feature is enabled
        if (!newPages.includes(pageKey)) newPages.push(pageKey);
      }
    }

    await updateRolePermissions(roleKey, newPages, newFeatures);
  };

  const currentSelectedPerm = rolesPermissions.find(r => r.roleKey === selectedRole) || { allowedPages: [], allowedFeatures: [] };

  return (
    <div className="w-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Sistem & Kullanıcı Ayarları"
        description="Sistem erişimlerini ve granüler yetki matrisini yönetin."
      />

      <div className="flex gap-2 border-b border-[#E8E6E1]">
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-colors relative",
            activeTab === 'users' ? "text-[#7C8363]" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Kullanıcı Yönetimi
          {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]" />}
        </button>
        <button 
          onClick={() => setActiveTab('roles')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-colors relative",
            activeTab === 'roles' ? "text-[#7C8363]" : "text-stone-500 hover:text-stone-700"
          )}
        >
          Rol ve Yetki Matrisi
          {activeTab === 'roles' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]" />}
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-stone-800">Sistem Kullanıcıları</h3>
            <button
              onClick={() => { closeForm(); setShowAddForm(true); }}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni Kullanıcı
            </button>
          </div>

          <div className="card-standard overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-[#E8E6E1] text-xs uppercase tracking-wider text-stone-500">
                  <th className="px-6 py-4 font-semibold">Ad Soyad</th>
                  <th className="px-6 py-4 font-semibold">E-posta</th>
                  <th className="px-6 py-4 font-semibold">Rol</th>
                  <th className="px-6 py-4 font-semibold">Durum</th>
                  <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-stone-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-stone-800">{user.fullName}</td>
                    <td className="px-6 py-4 text-sm text-stone-600">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs font-semibold">
                        {ROLE_NAMES[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                        user.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                      )}>
                        {user.status === 'active' ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => startEdit(user.id)} className="p-2 text-stone-400 hover:text-[#7C8363] transition-colors" title="Düzenle">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => { if(window.confirm('Silmek istediğinize emin misiniz?')) deleteUser(user.id); }} className="p-2 text-stone-400 hover:text-red-500 transition-colors" title="Sil">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-stone-500 font-medium">Kayıtlı kullanıcı bulunamadı.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Sistem Rolleri</h3>
            {Object.entries(ROLE_NAMES).map(([key, name]) => (
              <button
                key={key}
                onClick={() => setSelectedRole(key)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all border",
                  selectedRole === key 
                    ? "bg-[#7C8363] text-white border-[#7C8363] shadow-md shadow-[#7C8363]/20" 
                    : "bg-white text-stone-700 border-[#E8E6E1] hover:border-stone-300"
                )}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="md:col-span-3 card-standard p-6">
            <h3 className="text-xl font-bold text-stone-800 mb-2">{ROLE_NAMES[selectedRole]} Yetki Matrisi</h3>
            <p className="text-sm text-stone-500 mb-6">Bu rolün sayfa erişimlerini ve detaylı yetkilerini aşağıdan ayarlayabilirsiniz. Sistemdeki tüm deşifre edilmiş eylemler otomatik tanımlanmıştır.</p>

            {selectedRole === 'super_admin' ? (
              <div className="p-6 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-start gap-4">
                <ShieldAlert className="w-6 h-6 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold mb-1">Süper Admin Sınırsızdır</h4>
                  <p className="text-sm">Süper admin rolünün yetkileri sabittir, hiçbir şekilde kısıtlanamaz ve değiştirilemez. Tüm sayfalara ve tüm aksiyonlara limitsiz erişim hakkı vardır.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {PERMISSIONS_MATRIX.map(page => {
                  const isPageAllowed = currentSelectedPerm.allowedPages.includes(page.pageKey);
                  
                  return (
                    <div key={page.pageKey} className="border border-[#E8E6E1] rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-stone-50 p-4 border-b border-[#E8E6E1] flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-stone-800">{page.pageName}</h4>
                          <p className="text-xs text-stone-500">/{page.pageKey} rotasına ait görünümler ve işlemler</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 border border-[#E8E6E1] rounded-lg hover:bg-stone-50 transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-[#7C8363] focus:ring-[#7C8363]"
                            checked={isPageAllowed}
                            onChange={() => handleRolePermissionChange(selectedRole, page.pageKey)}
                          />
                          <span className="text-sm font-semibold text-stone-700">Sayfayı Görebilir</span>
                        </label>
                      </div>
                      
                      {page.features.length > 0 && (
                        <div className={cn("p-4 space-y-4", !isPageAllowed && "opacity-50 pointer-events-none")}>
                          {page.features.map(feature => {
                            const isFeatureAllowed = currentSelectedPerm.allowedFeatures.includes(feature.key);
                            return (
                              <label key={feature.key} className="flex items-start gap-4 cursor-pointer hover:bg-stone-50 p-2 rounded-lg -mx-2 transition-colors">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 mt-1 rounded text-[#7C8363] focus:ring-[#7C8363]"
                                  checked={isFeatureAllowed}
                                  onChange={() => handleRolePermissionChange(selectedRole, page.pageKey, feature.key)}
                                />
                                <div>
                                  <div className="font-semibold text-sm text-stone-800">{feature.name}</div>
                                  <div className="text-xs text-stone-500 mt-0.5">{feature.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {page.features.length === 0 && (
                        <div className="p-4 text-xs text-stone-400 italic">
                          Bu sayfada özel bir fonksiyon kısıtlaması bulunmuyor. Sayfa görüntüleme yetkisi yeterlidir.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      <AnimatePresence>
      {showAddForm && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-[#E8E6E1] flex justify-between items-center bg-[#FDFCFB]">
              <h2 className="text-xl font-bold text-stone-800">{editingUser ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Ekle'}</h2>
              <button onClick={closeForm} className="p-2 text-stone-400 hover:text-stone-600 transition-colors rounded-full hover:bg-stone-100"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad</label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: Ahmet Yılmaz" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">E-posta</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Örn: ahmet@otel.com" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Rol</label>
                    <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm font-medium">
                      {Object.entries(ROLE_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Durum</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm font-medium">
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8E6E1]">
                  <h4 className="font-semibold text-sm text-stone-800 mb-3">Yetkili Olunan Tesisler</h4>
                  
                  {['hr_director', 'super_admin'].includes(formData.role) ? (
                    <div className="p-3 bg-stone-50 border border-[#E8E6E1] rounded-lg text-xs text-stone-600 font-medium">
                      Bu rol sistemsel olarak tüm otel ve lojmanlarda tam yetkilidir. Seçim yapmanıza gerek yoktur.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.role === 'hotel_hr_manager' && (
                        <div>
                          <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Sorumlu Olduğu Oteller</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {hotels.map(h => (
                              <label key={h.id} className="flex items-center gap-2 text-sm p-2 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 border border-transparent hover:border-stone-200">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded text-[#7C8363] focus:ring-[#7C8363]"
                                  checked={formData.assignedHotelIds.includes(h.id)}
                                  onChange={(e) => {
                                    const newIds = e.target.checked 
                                      ? [...formData.assignedHotelIds, h.id] 
                                      : formData.assignedHotelIds.filter(id => id !== h.id);
                                    setFormData({...formData, assignedHotelIds: newIds});
                                  }}
                                />
                                <span className="font-medium text-stone-700">{h.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {formData.role === 'facility_manager' && (
                        <div>
                          <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Sorumlu Olduğu Lojmanlar</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {facilities.map(f => (
                              <label key={f.id} className="flex items-center gap-2 text-sm p-2 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 border border-transparent hover:border-stone-200">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded text-[#7C8363] focus:ring-[#7C8363]"
                                  checked={formData.assignedFacilityIds.includes(f.id)}
                                  onChange={(e) => {
                                    const newIds = e.target.checked 
                                      ? [...formData.assignedFacilityIds, f.id] 
                                      : formData.assignedFacilityIds.filter(id => id !== f.id);
                                    setFormData({...formData, assignedFacilityIds: newIds});
                                  }}
                                />
                                <span className="font-medium text-stone-700">{f.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#E8E6E1]">
                <button type="button" onClick={closeForm} className="px-5 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors">
                  İptal
                </button>
                <button type="submit" className="px-5 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors">
                  {editingUser ? 'Değişiklikleri Kaydet' : 'Kullanıcı Oluştur'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
