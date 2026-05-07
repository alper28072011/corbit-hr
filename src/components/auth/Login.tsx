import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, handleFirestoreError, OperationType } from "../../lib/firebase";

export default function Login() {
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
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
      <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-[#2D332D]">Corbit HR</h1>
          <p className="text-stone-500 mt-2">Lojman Yönetim Sistemi</p>
        </div>

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
