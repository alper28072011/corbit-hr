import { Bell, Menu, UserCircle, LogOut } from "lucide-react";
import { useStore } from "../../store/useStore";
import { auth } from "../../lib/firebase";

interface NavbarProps {
  onMenuClick: () => void;
}

const ROLE_NAMES: Record<string, string> = {
  super_admin: 'Süper Admin',
  hr_director: 'İK Direktörü',
  hotel_hr_manager: 'Otel İK Yöneticisi',
  facility_manager: 'Lojman Sorumlusu'
};

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { currentUser, roles } = useStore();

  const handleLogout = () => {
    auth.signOut();
  };

  const getRoleName = (roleKey: string) => {
    if (roles.length > 0) {
      const found = roles.find(r => r.key === roleKey);
      if (found) return found.name;
    }
    return ROLE_NAMES[roleKey] || roleKey;
  };

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#E8E6E1] bg-white px-8 z-10 sticky top-0">
      <button
        type="button"
        className="-m-2.5 p-2.5 text-stone-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Menüyü aç</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-[#E8E6E1] lg:hidden mx-4" aria-hidden="true" />

      <div className="flex flex-1 items-center justify-between gap-x-4 self-stretch lg:gap-x-6">
        <div className="relative flex flex-1 items-center max-w-md">
          {/* Arama */}
          <div className="flex flex-1 items-center bg-stone-100 rounded-full px-4 py-2">
            <span className="text-stone-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Personel veya oda ara..."
              className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm w-full ml-2"
            />
          </div>
        </div>
        <div className="flex items-center gap-x-6">
          <button
            type="button"
            className="relative p-2 text-stone-400 hover:bg-stone-50 rounded-full transition-colors"
          >
            <span className="sr-only">Bildirimleri göster</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span className="absolute top-1 max-right-1 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-x-3 pl-6 border-l border-stone-200">
            {currentUser && (
               <div className="text-right hidden sm:block">
                 <p className="text-sm font-bold text-[#1A1C18]">{currentUser.fullName}</p>
                 <p className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">{getRoleName(currentUser.role)}</p>
               </div>
            )}
            
            <div className="w-10 h-10 bg-[#E8E6E1] rounded-full overflow-hidden border-2 border-[#7C8363] flex items-center justify-center">
              <UserCircle className="h-8 w-8 text-stone-400" aria-hidden="true" />
            </div>

            <button 
              onClick={handleLogout}
              className="p-2 text-stone-400 text-sm hover:text-red-500 hover:bg-red-50 rounded-full transition-colors ml-2"
              title="Çıkış Yap"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
