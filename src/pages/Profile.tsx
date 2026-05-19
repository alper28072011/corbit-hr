import React, { useState } from "react";
import { User, Lock, Shield, Check, X, Building, LayoutGrid } from "lucide-react";
import { useStore } from "../store/useStore";
import { PageHeader } from "../components/layout/PageHeader";
import { ROLE_NAMES, PERMISSIONS_MATRIX } from "../lib/permissions";
import { cn } from "../lib/utils";

export default function Profile() {
  const { currentUser, updateProfile, changeUserPassword, hotels, facilities, rolesPermissions } = useStore();
  const [activeTab, setActiveTab] = useState<'personal' | 'security' | 'permissions'>('personal');

  const [profileData, setProfileData] = useState({
    fullName: currentUser?.fullName || '',
    phone: currentUser?.phone || '',
    avatarUrl: currentUser?.avatarUrl || ''
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');
    try {
      await updateProfile(profileData);
      setSuccessMessage('Profil bilgileriniz başarıyla güncellendi.');
    } catch (error: any) {
      setErrorMessage(error.message || 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    if (passwordData.newPassword.length < 6) {
      setErrorMessage('Şifre en az 6 karakter olmalıdır.');
      setIsLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrorMessage('Şifreler eşleşmiyor.');
      setIsLoading(false);
      return;
    }

    try {
      await changeUserPassword(passwordData.newPassword);
      setSuccessMessage('Şifreniz başarıyla değiştirildi.');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Şifre değiştirilirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  const currentRolePerms = rolesPermissions.find(r => r.roleKey === currentUser.role);
  const assignedHotels = hotels.filter(h => currentUser.assignedHotelIds?.includes(h.id));
  const assignedFacilities = facilities.filter(f => currentUser.assignedFacilityIds?.includes(f.id));

  return (
    <div className="w-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Profil ve Hesap Yönetimi"
        description="Kişisel bilgilerinizi, güvenlik ayarlarınızı ve sistem yetkilerinizi buradan yönetebilirsiniz."
      />

      {successMessage && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl flex items-center gap-3">
          <X className="w-5 h-5 text-red-600" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-2 border-b border-[#E8E6E1]">
        <button 
          onClick={() => setActiveTab('personal')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2",
            activeTab === 'personal' ? "text-[#7C8363]" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <User className="w-4 h-4" />
          Kişisel Bilgiler
          {activeTab === 'personal' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]" />}
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2",
            activeTab === 'security' ? "text-[#7C8363]" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <Lock className="w-4 h-4" />
          Hesap Güvenliği
          {activeTab === 'security' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]" />}
        </button>
        <button 
          onClick={() => setActiveTab('permissions')}
          className={cn(
            "px-6 py-3 font-semibold text-sm transition-colors relative flex items-center gap-2",
            activeTab === 'permissions' ? "text-[#7C8363]" : "text-stone-500 hover:text-stone-700"
          )}
        >
          <Shield className="w-4 h-4" />
          Yetkiler ve Sorumluluk
          {activeTab === 'permissions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]" />}
        </button>
      </div>

      <div className="card-standard p-6 max-w-4xl">
        {activeTab === 'personal' && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <h3 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">Kişisel Bilgiler</h3>
            
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex flex-col items-center gap-4 shrink-0">
                <div className="w-32 h-32 bg-stone-100 rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                  {profileData.avatarUrl ? (
                    <img src={profileData.avatarUrl} alt="Profil Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-bold text-stone-400">
                      {currentUser.fullName?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="w-full">
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1 text-center">Avatar URL (Opsiyonel)</label>
                  <input 
                    type="url" 
                    value={profileData.avatarUrl} 
                    onChange={e => setProfileData({...profileData, avatarUrl: e.target.value})} 
                    className="w-full px-3 py-2 border border-[#E8E6E1] rounded-lg text-sm focus:outline-none focus:border-[#7C8363] text-center" 
                    placeholder="https://..." 
                  />
                </div>
              </div>

              <div className="flex-1 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">E-posta Adresi (Değiştirilemez)</label>
                  <input type="email" value={currentUser.email} disabled className="w-full px-4 py-2.5 bg-stone-50 border border-[#E8E6E1] rounded-xl text-sm text-stone-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Sistem Rolü</label>
                  <div className="w-full px-4 py-2.5 bg-stone-50 border border-[#E8E6E1] rounded-xl text-sm flex items-center gap-2">
                     <Shield className="w-4 h-4 text-[#7C8363]" />
                     <span className="font-semibold text-stone-700">{ROLE_NAMES[currentUser.role] || currentUser.role}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad</label>
                  <input required type="text" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Adınız Soyadınız" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Telefon Numarası</label>
                  <input type="text" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Örn: 555 123 4567" />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors disabled:opacity-50">
                    {isLoading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
            <h3 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">Hesap Güvenliği</h3>
            
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm">
              Şifrenizi değiştirdiğinizde sistemden otomatik olarak <strong>çıkış yapılmayacaktır</strong>. Ancak diğer cihazlardaki oturumlarınız sonlandırılabilir.
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yeni Şifre</label>
                <input 
                  required 
                  type="password" 
                  value={passwordData.newPassword} 
                  onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" 
                  placeholder="En az 6 karakter" 
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yeni Şifre (Tekrar)</label>
                <input 
                  required 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} 
                  className="w-full px-4 py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" 
                  placeholder="Şifreyi onaylayın" 
                  minLength={6}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button type="submit" disabled={isLoading} className="px-6 py-2.5 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors disabled:opacity-50 inline-flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {isLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">Sorumluluk Alanlarım</h3>
              
              {currentUser.role === 'super_admin' ? (
                <div className="bg-stone-50 border border-[#E8E6E1] p-4 rounded-xl">
                  <p className="text-sm font-medium text-stone-700">Süper Admin olarak sistemdeki <strong>tüm otel ve lojmanlarda</strong> tam yetkilisiniz.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Building className="w-4 h-4" /> Oteller
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {assignedHotels.length > 0 ? (
                        assignedHotels.map(h => (
                          <span key={h.id} className="px-3 py-1.5 bg-[#7C8363]/10 text-[#7C8363] border border-[#7C8363]/20 rounded-lg text-sm font-semibold">{h.name}</span>
                        ))
                      ) : (
                        <span className="text-sm text-stone-500 italic">Atanmış otel bulunmuyor.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" /> Lojmanlar
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {assignedFacilities.length > 0 ? (
                        assignedFacilities.map(f => (
                          <span key={f.id} className="px-3 py-1.5 bg-[#7C8363]/10 text-[#7C8363] border border-[#7C8363]/20 rounded-lg text-sm font-semibold">{f.name}</span>
                        ))
                      ) : (
                        <span className="text-sm text-stone-500 italic">Atanmış lojman bulunmuyor.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-stone-800 border-b border-stone-100 pb-4">Sistem Yetkilerim (Fonksiyonel Matris)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {PERMISSIONS_MATRIX.map(page => {
                  const hasPageAccess = currentUser.role === 'super_admin' || currentRolePerms?.allowedPages.includes(page.pageKey);
                  return (
                    <div key={page.pageKey} className="space-y-3">
                      <div className="flex items-center gap-2">
                        {hasPageAccess ? (
                           <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                           <X className="w-5 h-5 text-red-400" />
                        )}
                        <h4 className={cn("font-bold text-base", hasPageAccess ? "text-stone-800" : "text-stone-400 line-through decoration-stone-300")}>{page.pageName}</h4>
                      </div>
                      
                      {page.features.length > 0 && (
                        <div className="pl-7 space-y-2">
                          {page.features.map(feature => {
                            const hasFeatureAccess = currentUser.role === 'super_admin' || (hasPageAccess && currentRolePerms?.allowedFeatures.includes(feature.key));
                            return (
                              <div key={feature.key} className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                  {hasFeatureAccess ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  ) : (
                                    <X className="w-3.5 h-3.5 text-red-400" />
                                  )}
                                </div>
                                <span className={cn("text-sm", hasFeatureAccess ? "text-stone-700" : "text-stone-400 line-through decoration-stone-300")}>
                                  {feature.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {page.features.length === 0 && (
                         <div className="pl-7 text-xs text-stone-400 italic">Özel fonksiyon kısıtı yok.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
