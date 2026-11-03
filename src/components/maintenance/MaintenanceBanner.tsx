import React, { useState } from "react";
import { AlertTriangle, Wrench, Settings, PowerOff } from "lucide-react";
import { useStore } from "../../store/useStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function MaintenanceBanner() {
  const { appSettings, currentUser, updateMaintenanceSettings } = useStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const maintenance = appSettings?.maintenance;
  const isEnabled = maintenance?.enabled;
  const isSuperAdmin = currentUser?.role === 'super_admin';

  if (!isEnabled || !isSuperAdmin) {
    return null;
  }

  const handleTurnOff = async () => {
    if (!window.confirm("Bakım modunu kapatmak ve tüm kullanıcıların sisteme yeniden erişmesine izin vermek istediğinizden emin misiniz?")) {
      return;
    }
    setLoading(true);
    try {
      await updateMaintenanceSettings({
        ...maintenance,
        enabled: false,
      });
      toast.success("Bakım modu kapatıldı. Tüm kullanıcılar artık sisteme erişebilir.");
    } catch (err) {
      toast.error("Bakım modu kapatılırken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-900 border-b border-amber-400 px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
        <Wrench className="w-4 h-4 text-stone-900 shrink-0" />
        <div className="text-xs sm:text-sm font-semibold truncate">
          <strong className="font-extrabold uppercase tracking-wide">Sistem Bakım Modunda:</strong>{" "}
          <span className="text-stone-900/90 font-medium">
            Uygulama yalnızca Süper Admin erişimine açıktır. Normal kullanıcılar bakım ekranını görmektedir.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/settings?tab=maintenance')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-amber-400" />
          <span>Bakım Ayarları</span>
        </button>

        <button
          type="button"
          onClick={handleTurnOff}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-stone-100 text-red-700 text-xs font-bold border border-red-300 transition-all shadow-sm cursor-pointer disabled:opacity-50"
          title="Bakım modunu derhal sonlandır"
        >
          <PowerOff className="w-3.5 h-3.5" />
          <span>{loading ? "Kapatılıyor..." : "Bakımı Kapat"}</span>
        </button>
      </div>
    </div>
  );
}
