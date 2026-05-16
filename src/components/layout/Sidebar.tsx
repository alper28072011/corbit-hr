import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  Wrench,
  Settings,
  X,
  LayoutGrid
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useStore } from "../../store/useStore";
import { PERMISSION_KEYS, hasPermission } from "../../lib/permissions";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const currentUser = useStore(state => state.currentUser);
  const roles = useStore(state => state.roles);
  const staff = useStore(state => state.staff);
  const pendingStaffCount = staff.filter(s => s.status === "pending_placement").length;

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_hotel_management, roles) && { name: "Tesis Yönetimi", href: "/facilities", icon: Building2 },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_room_management, roles) && { name: "Oda Yönetimi", href: "/rooms", icon: BedDouble },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_room_management, roles) && { name: "Oda Doluluk", href: "/rack", icon: LayoutGrid },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_staff_management, roles) && { 
      name: "Personel Yönetimi", 
      href: pendingStaffCount > 0 ? "/staff?filter=pending" : "/staff", 
      icon: Users,
      badge: pendingStaffCount
    },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_maintenance, roles) && { name: "Arıza ve Bakım", href: "/maintenance", icon: Wrench },
    hasPermission(currentUser?.role, PERMISSION_KEYS.view_settings, roles) && { name: "Ayarlar", href: "/settings", icon: Settings },
  ].filter(Boolean) as { name: string, href: string, icon: any, badge?: number }[];

  return (
    <>
      {/* Mobil arka plan */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-stone-900/80 transition-opacity lg:hidden",
          open ? "opacity-100 block" : "opacity-0 hidden"
        )}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-y-0 z-50 flex w-64 flex-col bg-[#2D332D] text-stone-200 transition-transform duration-300 ease-in-out lg:static lg:flex lg:w-64 lg:flex-none border-r border-[#E8E6E1]",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto w-full">
          <div className="p-8 pb-4 shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-[#7C8363] rounded-lg"></div>
                Lojman PMS
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-2 font-semibold">
                Hotel Chain Management
              </p>
            </div>
            <button
              type="button"
              className="-m-2.5 p-2.5 text-stone-400 hover:text-white lg:hidden"
              onClick={() => setOpen(false)}
            >
              <span className="sr-only">Menüyü kapat</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <nav className="flex flex-1 flex-col px-4">
            <ul role="list" className="flex flex-1 flex-col space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        isActive
                          ? "bg-[#3A413A] text-white"
                          : "text-stone-300 hover:bg-[#3A413A] hover:text-white",
                        "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            isActive ? "opacity-80" : "opacity-60",
                            "h-5 w-5 shrink-0"
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && item.badge > 0 ? (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto shrink-0 shadow-sm flex items-center justify-center min-w-[20px]">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="p-6 mt-auto">
            <div className="bg-[#3A413A] rounded-2xl p-4">
              <p className="text-xs text-stone-400">Sistem Durumu</p>
              <p className="text-sm font-semibold text-white">%99.9 Aktif</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
