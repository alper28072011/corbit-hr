import { useState, useEffect, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  Wrench,
  Settings,
  X,
  LayoutGrid,
  Check,
  Edit2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useStore } from "../../store/useStore";
import { PAGE_KEYS, canViewPage } from "../../lib/permissions";

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

export default function Sidebar({ open, setOpen, isCollapsed = false, setIsCollapsed }: SidebarProps) {
  const currentUser = useStore(state => state.currentUser);
  const rolesPermissions = useStore(state => state.rolesPermissions);
  const staff = useStore(state => state.staff);
  const facilities = useStore(state => state.facilities);
  const appSettings = useStore(state => state.appSettings);
  const updateAppVersion = useStore(state => state.updateAppVersion);
  const supportTickets = useStore((state) => state.supportTickets);
  
  const pendingStaffCount = useMemo(() => {
    let pending = staff.filter(s => s.status === "pending_placement");
    if (currentUser?.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      pending = pending.filter(s => s.hotelId && hotelIds.includes(s.hotelId));
    } else if (currentUser?.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      const managedFacs = facilities.filter(f => facIds.includes(f.id));
      const allowedHotelIds = managedFacs.flatMap(f => {
        if (f.allowedHotelIds && f.allowedHotelIds.length > 0) return f.allowedHotelIds;
        if ((f as any).hotelId) return [(f as any).hotelId];
        return [];
      });
      pending = pending.filter(s => s.hotelId && allowedHotelIds.includes(s.hotelId));
    }
    return pending.length;
  }, [staff, currentUser, facilities]);
  
  const openTicketsCount = supportTickets?.filter(t => t.status === 'Açık').length || 0;
  
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [versionInput, setVersionInput] = useState("");

  useEffect(() => {
    if (appSettings?.version) {
      setVersionInput(appSettings.version);
    }
  }, [appSettings?.version]);

  const handleVersionSave = async () => {
    if (versionInput.trim()) {
      await updateAppVersion(versionInput.trim());
    }
    setIsEditingVersion(false);
  };


  const navigation = [
    canViewPage(currentUser?.role, PAGE_KEYS.dashboard, rolesPermissions) && { name: "Dashboard", href: "/", icon: LayoutDashboard },
    canViewPage(currentUser?.role, PAGE_KEYS.facilities, rolesPermissions) && { name: "Tesis Yönetimi", href: "/facilities", icon: Building2 },
    canViewPage(currentUser?.role, PAGE_KEYS.rooms, rolesPermissions) && { name: "Oda Yönetimi", href: "/rooms", icon: BedDouble },
    canViewPage(currentUser?.role, PAGE_KEYS.rack, rolesPermissions) && { name: "Oda Doluluk", href: "/rack", icon: LayoutGrid },
    canViewPage(currentUser?.role, PAGE_KEYS.staff, rolesPermissions) && { 
      name: "Personel Yönetimi", 
      href: pendingStaffCount > 0 ? "/staff?filter=pending" : "/staff", 
      icon: Users,
      badge: pendingStaffCount
    },
    canViewPage(currentUser?.role, PAGE_KEYS.maintenance, rolesPermissions) && { name: "Arıza ve Bakım", href: "/maintenance", icon: Wrench },
    { 
      name: "Destek & Geribildirim", 
      href: "/feedback", 
      icon: MessageSquare,
      badge: currentUser?.role === 'super_admin' ? openTicketsCount : 0
    },
    canViewPage(currentUser?.role, PAGE_KEYS.settings, rolesPermissions) && { name: "Ayarlar", href: "/settings", icon: Settings },
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
          "fixed inset-y-0 z-50 flex flex-col bg-[#2D332D] text-stone-200 transition-all duration-300 ease-in-out lg:fixed lg:top-0 lg:h-screen lg:flex lg:flex-none border-r border-[#E8E6E1]",
          open ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
          !open && isCollapsed ? "lg:w-20 w-64" : "w-64"
        )}
      >
        {/* Toggle Button for Desktop - Moved outside overflow container so it is never clipped */}
        {setIsCollapsed && (
          <button
             onClick={() => setIsCollapsed(!isCollapsed)}
             className="hidden lg:flex absolute -right-3 top-10 bg-[#7C8363] text-white p-1 rounded-full shadow-lg border-2 border-[#2D332D] hover:bg-[#6c7356] transition-colors z-[100]"
          >
             {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        <div className={cn("flex grow flex-col gap-y-5 w-full relative", isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden scrollbar-hide")}>
          <div className={cn("pb-4 shrink-0 flex items-center justify-between relative h-24 transition-all duration-300", isCollapsed ? "px-6 pt-8" : "p-8")}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 bg-[#7C8363] rounded-lg shrink-0 flex items-center justify-center font-bold text-lg text-white">C</div>
              <div className={cn(
                "transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden",
                isCollapsed ? "opacity-0 w-0" : "opacity-100"
              )}>
                <h1 className="text-xl font-bold tracking-tight text-white">
                  Corbit HR
                </h1>
                <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1 font-semibold">
                  Management
                </p>
              </div>
            </div>
            
            <button
              type="button"
              className="-m-2.5 p-2.5 text-stone-400 hover:text-white lg:hidden absolute right-4 top-8"
              onClick={() => setOpen(false)}
            >
              <span className="sr-only">Menüyü kapat</span>
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <nav className={cn("flex flex-col", isCollapsed ? "px-3" : "px-4")}>
            <ul role="list" className="flex flex-col space-y-1">
              {navigation.map((item) => (
                <li key={item.name} className="relative group">
                  <NavLink
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        isActive
                          ? "bg-[#3A413A] text-white"
                          : "text-stone-300 hover:bg-[#3A413A] hover:text-white",
                        "flex items-center rounded-xl text-sm font-medium transition-all",
                        isCollapsed ? "justify-center p-3" : "gap-3 py-3 px-4"
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
                        <span className={cn(
                           "whitespace-nowrap transition-all duration-300",
                           isCollapsed ? "absolute left-14 opacity-0 w-0 overflow-hidden pointer-events-none" : "flex-1 opacity-100 relative left-0"
                        )}>{item.name}</span>
                        {!isCollapsed && item.badge && item.badge > 0 ? (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-auto shrink-0 shadow-sm flex items-center justify-center min-w-[20px]">
                            {item.badge}
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                  {isCollapsed && (
                     <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 hidden lg:flex items-center px-3 py-1.5 bg-[#1A1C18] text-white text-xs font-semibold rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none z-[60] whitespace-nowrap shadow-xl">
                       {item.name}
                       {item.badge && item.badge > 0 ? ` (${item.badge})` : ''}
                       <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1A1C18] rotate-45"></div>
                     </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className={cn("mt-auto transition-all duration-300", isCollapsed ? "p-3" : "p-6")}>
            <div className={cn(
              "bg-[#3A413A] rounded-2xl flex flex-col gap-2 relative group items-center",
              isCollapsed ? "p-3" : "p-4 items-start"
            )}>
              {isCollapsed ? (
                <div className="text-stone-400 py-1">
                   <Settings className="w-5 h-5 opacity-60" />
                   {/* Tooltip for settings area */}
                   <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 hidden lg:block px-3 py-2 bg-[#1A1C18] text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60] whitespace-nowrap shadow-xl">
                     Sistem: %99.9 Aktif<br/>VK: {appSettings?.version || "v1.0.0"}
                     <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#1A1C18] rotate-45"></div>
                   </div>
                </div>
              ) : (
                <>
                  <div className="w-full flex justify-between items-center">
                    <div>
                      <p className="text-xs text-stone-400">Sistem Durumu</p>
                      <p className="text-sm font-semibold text-white">%99.9 Aktif</p>
                    </div>
                    <button 
                      onClick={() => window.location.href = "/"}
                      className="p-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-stone-300 hover:text-white transition-colors"
                      title="Sistemi Yenile (CTRL+F5)"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="border-t border-white/10 pt-2 mt-1 w-full">
                     {isEditingVersion ? (
                        <div className="flex items-center gap-2">
                           <input
                              type="text"
                              value={versionInput}
                              onChange={(e) => setVersionInput(e.target.value)}
                              className="bg-stone-900 text-xs px-2 py-1 rounded w-full text-white focus:outline-none focus:ring-1 focus:ring-[#7C8363]"
                              autoFocus
                              onKeyDown={(e) => {
                                 if (e.key === 'Enter') handleVersionSave();
                                 if (e.key === 'Escape') {
                                    setIsEditingVersion(false);
                                    setVersionInput(appSettings?.version || "v1.0.0");
                                 }
                              }}
                           />
                           <button onClick={handleVersionSave} className="text-green-400 hover:text-green-300 shrink-0">
                              <Check className="w-3 h-3" />
                           </button>
                        </div>
                     ) : (
                        <div className="flex items-center justify-between group/ver">
                           <p className="text-xs text-stone-400 font-mono tracking-wider">
                              {appSettings?.version || "v1.0.0"}
                           </p>
                           {currentUser?.role === 'super_admin' && (
                              <button onClick={() => setIsEditingVersion(true)} className="text-stone-500 opacity-0 group-hover/ver:opacity-100 transition-opacity hover:text-white shrink-0">
                                 <Edit2 className="w-3 h-3" />
                              </button>
                           )}
                        </div>
                     )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
