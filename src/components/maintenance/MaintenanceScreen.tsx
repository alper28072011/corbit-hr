import React, { useState, useEffect } from "react";
import { Wrench, Clock, Mail, Phone, RefreshCw, LogOut, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";
import { useStore } from "../../store/useStore";
import { auth } from "../../lib/firebase";
import { cn } from "../../lib/utils";

export default function MaintenanceScreen() {
  const { appSettings, currentUser } = useStore();
  const maintenance = appSettings?.maintenance;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);

  const title = maintenance?.title || "Planlı Sistem Bakım Çalışması";
  const message = maintenance?.message || "Sistemlerimizde altyapı güçlendirme ve güvenlik güncellemeleri yapılmaktadır. Bu süre zarfında uygulamamız geçici olarak servis dışıdır. Kısa süre içinde tekrar hizmetinizde olacağız.";
  const estimatedEndTime = maintenance?.estimatedEndTime;
  const contactEmail = maintenance?.contactEmail;
  const contactPhone = maintenance?.contactPhone;

  // Live countdown timer calculation if estimatedEndTime is provided
  useEffect(() => {
    if (!estimatedEndTime) {
      setTimeLeftStr(null);
      return;
    }

    const calculateTimeLeft = () => {
      try {
        const target = new Date(estimatedEndTime).getTime();
        const now = Date.now();
        const diff = target - now;

        if (isNaN(target)) {
          setTimeLeftStr(null);
          return;
        }

        if (diff <= 0) {
          setTimeLeftStr("Tahmini sürenin sonuna gelindi (tamamlanmak üzere)");
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 24) {
          const days = Math.floor(hours / 24);
          setTimeLeftStr(`Yaklaşık ${days} gün kaldı`);
        } else if (hours > 0) {
          setTimeLeftStr(`Kalan Süre: ${hours} saat ${minutes} dakika`);
        } else if (minutes > 0) {
          setTimeLeftStr(`Kalan Süre: ${minutes} dakika ${seconds} saniye`);
        } else {
          setTimeLeftStr(`Kalan Süre: ${seconds} saniye`);
        }
      } catch (err) {
        setTimeLeftStr(null);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [estimatedEndTime]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const formatEstimatedDate = (isoStr?: string) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FDFCFB] flex flex-col justify-between items-center p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Ambient background decoration */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#7C8363]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Header Logo */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-2 pb-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D332D] text-white flex items-center justify-center font-serif font-black text-xl shadow-md border border-stone-800">
            C
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[#2D332D] tracking-tight leading-tight">Corbit HR</h1>
            <p className="text-[11px] font-semibold tracking-wider uppercase text-stone-500">Lojman & Personel Yönetimi</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Bakım Modu</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E8E6E1] shadow-2xl p-6 sm:p-10 z-10 my-auto text-center relative overflow-hidden">
        {/* Top Decorative accent bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-[#7C8363]" />

        {/* Animated Icon Avatar */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 bg-amber-100 rounded-3xl rotate-6 animate-pulse" />
          <div className="absolute inset-0 bg-[#7C8363]/10 rounded-3xl -rotate-3" />
          <div className="relative w-full h-full bg-gradient-to-br from-[#2D332D] to-stone-800 rounded-3xl flex items-center justify-center text-amber-400 shadow-xl border border-stone-700">
            <Wrench className="w-11 h-11 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Sistem Geçici Olarak Servis Dışıdır</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#2D332D] tracking-tight mb-3">
          {title}
        </h2>

        {/* Message */}
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Estimated Time Card (if present) */}
        {estimatedEndTime && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left max-w-lg mx-auto flex items-start gap-3.5 shadow-sm">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-sm shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">Tahmini Tamamlanma Zamanı</div>
              <div className="text-sm sm:text-base font-bold text-stone-800 mt-0.5">
                {formatEstimatedDate(estimatedEndTime)}
              </div>
              {timeLeftStr && (
                <div className="text-xs font-semibold text-amber-700 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                  <span>{timeLeftStr}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role restriction explanation banner */}
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-600 text-xs text-left max-w-lg mx-auto mb-6 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-stone-800">Erişim Kısıtlaması: </span>
            Bakım çalışması boyunca veri kaybını ve olası çakışmaları engellemek adına uygulamaya <strong className="text-stone-800">yalnızca Süper Admin</strong> yetkisine sahip kullanıcılar erişebilmektedir.
          </div>
        </div>

        {/* Emergency Contact Info (if configured) */}
        {(contactEmail || contactPhone) && (
          <div className="mb-8 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-center gap-4 text-xs text-stone-600">
            <span className="font-semibold text-stone-400">Acil Durum İletişim:</span>
            {contactEmail && (
              <a 
                href={`mailto:${contactEmail}`}
                className="inline-flex items-center gap-1.5 text-[#7C8363] hover:text-[#2D332D] font-bold transition-colors underline decoration-stone-300 underline-offset-4"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{contactEmail}</span>
              </a>
            )}
            {contactPhone && (
              <a 
                href={`tel:${contactPhone}`}
                className="inline-flex items-center gap-1.5 text-[#7C8363] hover:text-[#2D332D] font-bold transition-colors underline decoration-stone-300 underline-offset-4"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{contactPhone}</span>
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2D332D] hover:bg-stone-800 text-white font-bold text-sm shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-75"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Kontrol Ediliyor..." : "Durumu Yenile / Kontrol Et"}</span>
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-bold text-sm border border-stone-300 transition-all active:scale-98 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-stone-500" />
              <span>Çıkış Yap / Süper Admin Girişi</span>
            </button>
          )}
        </div>

        {currentUser && (
          <p className="text-[11px] text-stone-400 mt-4">
            Giriş Yapılan Hesap: <strong className="text-stone-600">{currentUser.fullName || currentUser.email}</strong> ({currentUser.role})
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-stone-400 py-4 z-10 flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <span>Corbit HR &copy; {new Date().getFullYear()} • Kesintisiz ve Güvenli Hizmet Altyapısı</span>
      </div>
    </div>
  );
}
