import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import { Wrench } from "lucide-react";

export default function Login() {
  const { appSettings } = useStore();
  const maintenance = appSettings?.maintenance;
  const isMaintenanceActive = Boolean(maintenance?.enabled);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: import('react').FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError(err.message || "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
      <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-xl w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif font-bold text-[#2D332D]">Corbit HR</h1>
          <p className="text-stone-500 mt-2">Management</p>
        </div>

        {isMaintenanceActive && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1 text-amber-800">
              <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{maintenance?.title || "Planlı Sistem Bakım Çalışması"}</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              {maintenance?.message || "Sistemimiz şu anda bakım modundadır."}
            </p>
            <div className="mt-2 pt-2 border-t border-amber-200/60 font-semibold text-[11px] text-amber-700 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
              <span>Yalnızca Süper Admin kullanıcılar sisteme giriş yapabilir.</span>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#E8E6E1] rounded-xl focus:outline-none focus:border-[#7C8363]"
              placeholder="hr@hotel.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-600 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-[#E8E6E1] rounded-xl focus:outline-none focus:border-[#7C8363]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#7C8363] text-white rounded-xl font-bold hover:bg-[#6A7152] transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
