import React, { useState, useEffect } from "react";
import { 
  Wrench, 
  ShieldAlert, 
  Clock, 
  Mail, 
  Phone, 
  Save, 
  PowerOff, 
  CheckCircle2, 
  AlertTriangle, 
  Eye, 
  RefreshCw, 
  Sparkles,
  Info
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";

export default function MaintenanceSettingsTab() {
  const { appSettings, updateMaintenanceSettings, currentUser } = useStore();
  const currentMaintenance = appSettings?.maintenance;

  const [enabled, setEnabled] = useState<boolean>(() => Boolean(currentMaintenance?.enabled));
  const [title, setTitle] = useState<string>(() => currentMaintenance?.title || "Planlı Sistem Bakım Çalışması");
  const [message, setMessage] = useState<string>(() => currentMaintenance?.message || "Sistemlerimizde altyapı güçlendirme ve güvenlik güncellemeleri yapılmaktadır. Bu süre zarfında uygulamamız geçici olarak servis dışıdır. Kısa süre içinde tekrar hizmetinizde olacağız.");
  const [estimatedEndTime, setEstimatedEndTime] = useState<string>(() => currentMaintenance?.estimatedEndTime || "");
  const [contactEmail, setContactEmail] = useState<string>(() => currentMaintenance?.contactEmail || "");
  const [contactPhone, setContactPhone] = useState<string>(() => currentMaintenance?.contactPhone || "");
  
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync state if store updates from server
  useEffect(() => {
    if (currentMaintenance) {
      setEnabled(Boolean(currentMaintenance.enabled));
      if (currentMaintenance.title !== undefined) setTitle(currentMaintenance.title);
      if (currentMaintenance.message !== undefined) setMessage(currentMaintenance.message);
      if (currentMaintenance.estimatedEndTime !== undefined) setEstimatedEndTime(currentMaintenance.estimatedEndTime);
      if (currentMaintenance.contactEmail !== undefined) setContactEmail(currentMaintenance.contactEmail);
      if (currentMaintenance.contactPhone !== undefined) setContactPhone(currentMaintenance.contactPhone);
    }
  }, [currentMaintenance]);

  const handleQuickDuration = (minutes: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    // Format to datetime-local string (YYYY-MM-DDTHH:mm)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setEstimatedEndTime(`${year}-${month}-${day}T${hours}:${mins}`);
  };

  const handleTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setEstimatedEndTime(`${year}-${month}-${day}T09:00`);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enabled && !title.trim()) {
      toast.error("Lütfen bakım ekranı için bir başlık giriniz.");
      return;
    }

    setSaving(true);
    try {
      await updateMaintenanceSettings({
        enabled,
        title: title.trim(),
        message: message.trim(),
        estimatedEndTime: estimatedEndTime.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        allowedRoles: ['super_admin']
      });

      if (enabled) {
        toast.success("Bakım modu AKTİF edildi. Yalnızca Süper Admin erişebilir.", { duration: 4000 });
      } else {
        toast.success("Bakım modu KAPATILDI. Sistem tüm kullanıcılara açıldı.", { duration: 4000 });
      }
    } catch (err: any) {
      console.error("Save maintenance error:", err);
      toast.error("Ayarlar kaydedilirken hata oluştu: " + (err?.message || "Bilinmeyen hata"));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickTurnOff = async () => {
    if (!window.confirm("Bakım modunu sonlandırmak ve uygulamayı tüm kullanıcılara açmak istediğinize emin misiniz?")) {
      return;
    }
    setSaving(true);
    try {
      await updateMaintenanceSettings({
        enabled: false,
        title: title.trim(),
        message: message.trim(),
        estimatedEndTime: estimatedEndTime.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        allowedRoles: ['super_admin']
      });
      setEnabled(false);
      toast.success("Bakım modu başarıyla kapatıldı.");
    } catch (err: any) {
      toast.error("Bakım modu kapatılamadı: " + (err?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayDate = (val?: string) => {
    if (!val) return null;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return val;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Status Banner */}
      <div className={cn(
        "p-6 rounded-3xl border transition-all duration-300 shadow-sm relative overflow-hidden",
        enabled 
          ? "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-300" 
          : "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-300"
      )}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
              enabled ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
            )}>
              {enabled ? <Wrench className="w-7 h-7 animate-[spin_8s_linear_infinite]" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className={cn(
                  "px-3 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wider inline-flex items-center gap-1.5",
                  enabled ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                )}>
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  {enabled ? "BAKIM MODU AÇIK (AKTİF)" : "NORMAL ÇALIŞMA MODU (KAPALI)"}
                </span>

                {currentMaintenance?.updatedAt && (
                  <span className="text-[11px] text-stone-400 font-medium hidden sm:inline">
                    Son güncelleme: {new Date(currentMaintenance.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-stone-800">
                {enabled ? "Sistem Bakım Modu Devrede" : "Sistem Tüm Kullanıcılara Açık"}
              </h3>

              <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
                {enabled ? (
                  <>
                    <strong className="text-amber-800 font-bold">Yalnızca Süper Admin</strong> yetkisine sahip kullanıcılar uygulamaya erişebilir. Diğer tüm personel ve yöneticiler aşağıdaki parametrik bakım ekranını görür.
                  </>
                ) : (
                  <>
                    Uygulama tüm yetkili otel yöneticileri ve lojman personellerine açıktır. Bakım gerektiren durumlarda aşağıdaki anahtarı açarak uygulamayı bakım moduna alabilirsiniz.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            {/* Toggle Switch */}
            <label className="flex items-center gap-3 cursor-pointer select-none bg-white px-4 py-2.5 rounded-2xl border border-stone-200 shadow-sm hover:border-stone-300 transition-colors">
              <div className="text-right">
                <span className="block text-xs font-bold text-stone-700">Bakım Modu</span>
                <span className={cn("text-[11px] font-semibold", enabled ? "text-amber-600" : "text-stone-400")}>
                  {enabled ? "Aktif" : "Pasif"}
                </span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only"
                />
                <div className={cn(
                  "w-14 h-8 rounded-full transition-colors duration-200 ease-in-out p-1 shadow-inner",
                  enabled ? "bg-amber-500" : "bg-stone-300"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out flex items-center justify-center text-[10px] font-bold",
                    enabled ? "translate-x-6 text-amber-600" : "translate-x-0 text-stone-400"
                  )}>
                    {enabled ? "ON" : "OFF"}
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {enabled && (
          <div className="mt-4 pt-4 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 font-medium">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Normal kullanıcılar herhangi bir sayfaya erişmeye çalıştığında otomatik olarak bakım ekranına yönlendirilir.</span>
            </div>
            <button
              type="button"
              onClick={handleQuickTurnOff}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-red-50 text-red-600 font-bold border border-red-200 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Bakımı Hemen Kapat</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Settings Form & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Parameters */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleSave} className="card-standard p-6 space-y-5 bg-white border border-[#E8E6E1] rounded-3xl shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E6E1]">
              <div className="flex items-center gap-2.5">
                <Wrench className="w-5 h-5 text-[#7C8363]" />
                <h4 className="font-bold text-stone-800 text-base">Bakım Ekranı Parametreleri</h4>
              </div>
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">Kullanıcı Bilgilendirmesi</span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Bakım Başlığı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Planlı Sistem Bakım Çalışması"
                required
                className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-[#7C8363] focus:ring-2 focus:ring-[#7C8363]/20 transition-all font-semibold text-stone-800"
              />
              <p className="text-[11px] text-stone-500 mt-1">Kullanıcıların bakım ekranında en üstte göreceği dikkat çekici başlık.</p>
            </div>

            {/* Message / Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Duyuru & Açıklama Mesajı
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bakım nedeni ve detayları hakkında kullanıcılara iletmek istediğiniz mesaj..."
                className="w-full px-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-[#7C8363] focus:ring-2 focus:ring-[#7C8363]/20 transition-all text-stone-700 leading-relaxed resize-y"
              />
              <p className="text-[11px] text-stone-500 mt-1">Yapılan çalışma, veri güvenliği veya tahmini geri dönüş hakkında açıklama yazabilirsiniz.</p>
            </div>

            {/* Estimated End Time */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Tahmini Bitiş Tarihi ve Saati</span>
                </label>
                {estimatedEndTime && (
                  <button
                    type="button"
                    onClick={() => setEstimatedEndTime("")}
                    className="text-[11px] text-red-600 hover:text-red-700 font-bold cursor-pointer"
                  >
                    Temizle (Süresiz)
                  </button>
                )}
              </div>

              <input
                type="datetime-local"
                value={estimatedEndTime}
                onChange={(e) => setEstimatedEndTime(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-stone-300 rounded-xl bg-white focus:outline-none focus:border-[#7C8363] font-medium text-stone-800"
              />

              {/* Quick shortcut buttons */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">Hızlı Süre Ekle:</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(30)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-[#7C8363] hover:text-[#7C8363] font-medium text-stone-700 transition-colors shadow-xs"
                  >
                    +30 Dk
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(60)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-[#7C8363] hover:text-[#7C8363] font-medium text-stone-700 transition-colors shadow-xs"
                  >
                    +1 Saat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(120)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-[#7C8363] hover:text-[#7C8363] font-medium text-stone-700 transition-colors shadow-xs"
                  >
                    +2 Saat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDuration(240)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-[#7C8363] hover:text-[#7C8363] font-medium text-stone-700 transition-colors shadow-xs"
                  >
                    +4 Saat
                  </button>
                  <button
                    type="button"
                    onClick={handleTomorrowMorning}
                    className="px-2.5 py-1 text-xs rounded-lg bg-white border border-stone-200 hover:border-[#7C8363] hover:text-[#7C8363] font-medium text-stone-700 transition-colors shadow-xs"
                  >
                    Yarın 09:00
                  </button>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Acil İletişim E-Postası</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="destek@rubiplatinum.com"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Acil İletişim Telefonu</span>
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+90 (242) 510 00 00"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-[#7C8363]"
                />
              </div>
            </div>

            {/* Security Notice */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Yalnızca Süper Admin Erişimi:</strong>
                Bu ayarlama kaydedildiğinde, süperadmin haricindeki hiçbir kullanıcı sisteme veri giremez veya ekranları görüntüleyemez. Süperadmin oturumu bu kısıtlamadan muaftır.
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-[#E8E6E1] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-stone-500">
                {currentMaintenance?.updatedBy && (
                  <span>Son düzenleyen: <strong>{currentMaintenance.updatedBy}</strong></span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2D332D] hover:bg-stone-800 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-98 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? "Kaydediliyor..." : "Ayarları Kaydet ve Uygula"}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Live Preview of Maintenance Screen */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-stone-700 font-bold text-sm">
              <Eye className="w-4 h-4 text-[#7C8363]" />
              <span>Kullanıcı Ekranı Canlı Önizleme</span>
            </div>
            <span className="text-[11px] font-semibold text-stone-400">Canlı Simülasyon</span>
          </div>

          <div className="bg-stone-100 p-4 rounded-3xl border border-stone-200">
            {/* Mock Screen Frame */}
            <div className="bg-[#FDFCFB] rounded-2xl border border-stone-300 p-5 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-[#7C8363]" />
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-left">
                  <div className="w-6 h-6 rounded-md bg-[#2D332D] text-white flex items-center justify-center font-serif font-black text-xs">
                    C
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-800 leading-none">Corbit HR</div>
                    <div className="text-[9px] text-stone-400">Lojman Yönetimi</div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                  Bakım Modu
                </span>
              </div>

              {/* Icon */}
              <div className="w-14 h-14 bg-gradient-to-br from-[#2D332D] to-stone-800 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
                <Wrench className="w-7 h-7" />
              </div>

              {/* Title */}
              <h5 className="text-base font-serif font-bold text-stone-800 mb-1.5 leading-snug">
                {title || "Planlı Sistem Bakım Çalışması"}
              </h5>

              {/* Message */}
              <p className="text-xs text-stone-600 mb-3 line-clamp-4 leading-relaxed">
                {message || "Sistemlerimizde altyapı güçlendirme çalışmaları yapılmaktadır..."}
              </p>

              {/* Estimated time */}
              {estimatedEndTime && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-left mb-3 flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Tahmini Bitiş</div>
                    <div className="text-xs font-bold text-stone-800">
                      {formatDisplayDate(estimatedEndTime)}
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts */}
              {(contactEmail || contactPhone) && (
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-[10px] text-stone-500 mb-3 space-y-0.5 text-left">
                  {contactEmail && <div>E-posta: <strong className="text-stone-700">{contactEmail}</strong></div>}
                  {contactPhone && <div>Telefon: <strong className="text-stone-700">{contactPhone}</strong></div>}
                </div>
              )}

              {/* Mock Buttons */}
              <div className="flex gap-2">
                <div className="flex-1 py-1.5 bg-[#2D332D] text-white text-[11px] font-bold rounded-lg opacity-90">
                  Sayfayı Yenile
                </div>
                <div className="flex-1 py-1.5 bg-white border border-stone-300 text-stone-700 text-[11px] font-bold rounded-lg">
                  Çıkış Yap
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 text-center mt-3 flex items-center justify-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Normal kullanıcılar siteye girdiğinde bu ekranı görecektir.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
