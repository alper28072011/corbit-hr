import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Menu, UserCircle, LogOut, ShieldAlert, Check, X, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../../store/useStore";
import { auth, db } from "../../lib/firebase";
import { cn } from "../../lib/utils";

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
  const { 
    currentUser, roles, approvalRequests, resolveApprovalRequest, 
    placeStaff, updateStaff, staff, rooms, facilities, addLog,
    changeStaffRoom, accommodations, markApprovalRequestAsRead
  } = useStore();
  const [showApprovals, setShowApprovals] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const approvalsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (approvalsRef.current && !approvalsRef.current.contains(event.target as Node)) {
        setShowApprovals(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sadece yetkili kisiler approval görebilecek
  const canManageApprovals = currentUser?.role === 'super_admin' || currentUser?.role === 'hr_director';
  const pendingApprovals = approvalRequests.filter(r => r.status === 'Bekliyor');

  const myResolvedRequests = useMemo(() => {
    if (!currentUser) return [];
    return approvalRequests.filter(r => 
      (r.status === 'Onaylandı' || r.status === 'Reddedildi') &&
      r.viewedByRequester !== true &&
      (r.requestedById === currentUser.id || r.requestedBy === currentUser.email || r.requestedBy === currentUser.fullName)
    );
  }, [approvalRequests, currentUser]);
  
  const pendingPlacement = useMemo(() => {
    let pending = staff.filter(s => (s.status === "pending_placement" || s.status === "pending_approval") && !s.deletedAt);
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
      pending = pending.filter(s => {
        if (s.status === 'pending_placement') {
          return s.hotelId && allowedHotelIds.includes(s.hotelId);
        } else if (s.status === 'pending_approval') {
          const req = approvalRequests.find(r => r.staffId === s.id && r.status === 'Bekliyor');
          if (!req) return false;
          const reqRoom = rooms.find(r => r.id === req.targetRoomId);
          const isTargetFacilityManaged = reqRoom && facIds.includes(reqRoom.facilityId);
          const isRequestedByMe = req.requestedById === currentUser.id || req.requestedBy === currentUser.email || req.requestedBy === currentUser.fullName;
          const isHotelAllowed = s.hotelId && allowedHotelIds.includes(s.hotelId);
          return !!(isTargetFacilityManaged || isRequestedByMe || isHotelAllowed);
        }
        return false;
      });
    }
    return pending.length;
  }, [staff, currentUser, facilities, approvalRequests, rooms]);

  const pendingCheckout = useMemo(() => {
    let pending = staff.filter(s => s.status === "pending_checkout" && !s.deletedAt);
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

  const handleApprove = async (approvalId: string, staffId: string, facilityId: string, roomId: string) => {
    const req = approvalRequests.find(r => r.id === approvalId);
    await resolveApprovalRequest(approvalId, 'Onaylandı');
    const targetStaff = staff.find(s => s.id === staffId);
    
    if (req?.sourceRoomId || targetStaff?.status === 'placed') {
      // Oda değişikliği onay akışı
      const oldRoomId = req?.sourceRoomId || accommodations.find(a => a.staffId === staffId && a.status === 'active')?.roomId;
      if (oldRoomId) {
        await changeStaffRoom(staffId, oldRoomId, roomId, facilityId);
        await addLog({
          entityId: staffId,
          entityType: 'staff',
          action: 'room_change',
          changes: 'İK Onayı ile oda değişikliği tamamlandı.',
          performedBy: currentUser?.fullName || 'System',
          timestamp: Date.now()
        });
      }
    } else {
      // İlk yerleşim onay akışı
      if (targetStaff && targetStaff.status !== 'placed' as any) {
        await placeStaff(staffId, facilityId, roomId, true);
        await addLog({
          entityId: staffId,
          entityType: 'staff',
          action: 'update',
          changes: 'İK Onayı ile yerleşti.',
          performedBy: currentUser?.fullName || 'System',
          timestamp: Date.now()
        });
      }
    }
  };

  const handleReject = async (approvalId: string, staffId: string) => {
    await resolveApprovalRequest(approvalId, 'Reddedildi');
    const targetStaff = staff.find(s => s.id === staffId);
    if (targetStaff?.status === 'pending_approval') {
      await updateStaff(staffId, { status: 'pending_placement' });
    }
  };

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#E8E6E1] bg-white px-8 z-40 sticky top-0">
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
          {/* Bildirim Özeti */}
          {(pendingPlacement > 0 || pendingCheckout > 0) ? (
            <div className="flex flex-1 items-center gap-3 bg-[#FCFBF8] rounded-2xl px-4 py-2 border border-[#E8E6E1] shadow-sm">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
              <span className="text-sm font-medium text-stone-600">
                {pendingPlacement > 0 && pendingCheckout > 0 ? (
                  <><strong className="text-stone-800">{pendingPlacement}</strong> personel yerleşim için, <strong className="text-stone-800">{pendingCheckout}</strong> personel çıkış işlemi için bekliyor.</>
                ) : pendingPlacement > 0 ? (
                  <><strong className="text-stone-800">{pendingPlacement}</strong> personel yerleşim için bekliyor.</>
                ) : (
                  <><strong className="text-stone-800">{pendingCheckout}</strong> personel çıkış işlemi için bekliyor.</>
                )}
              </span>
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-3 bg-stone-50 rounded-2xl px-4 py-2 border border-[#E8E6E1] opacity-60">
              <div className="w-2 h-2 rounded-full bg-[#7C8363] shrink-0"></div>
              <span className="text-sm font-medium text-stone-500">
                Tüm personel işlemleri tamamlandı, bekleyen görev yok.
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-x-6">
          <div className="relative" ref={approvalsRef}>
             <button
               type="button"
               onClick={() => setShowApprovals(!showApprovals)}
               className="relative p-2 rounded-full text-stone-600 hover:bg-stone-50 transition-colors"
             >
               <span className="sr-only">Bildirimleri göster</span>
               <Bell className="h-6 w-6" aria-hidden="true" />
               {(canManageApprovals ? pendingApprovals.length : myResolvedRequests.length) > 0 && (
                 <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white flex items-center justify-center text-[9px] font-bold rounded-full border-2 border-white">
                   {canManageApprovals ? pendingApprovals.length : myResolvedRequests.length}
                 </span>
               )}
             </button>

             {/* Approvals and Notifications Dropdown */}
             {showApprovals && (
                <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] py-2 z-50">
                   {canManageApprovals ? (
                     <>
                       <div className="px-4 py-2 border-b border-stone-100">
                          <h4 className="font-bold text-sm text-[#2D332D]">Onay Bekleyen İşlemler</h4>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto">
                          {pendingApprovals.length === 0 ? (
                             <div className="p-4 text-center text-sm text-stone-500">Bekleyen onay talebi yok.</div>
                          ) : (
                             <div className="divide-y divide-stone-100">
                                {pendingApprovals.map(req => {
                                   const reqStaff = staff.find(s => s.id === req.staffId);
                                   const reqRoom = rooms.find(r => r.id === req.targetRoomId);
                                   const reqFacility = facilities.find(f => f.id === reqRoom?.facilityId);
                                   
                                   return (
                                      <div key={req.id} className="p-4 flex flex-col gap-2 relative group hover:bg-stone-50 transition-colors">
                                         <div className="flex items-start gap-2">
                                            <ShieldAlert className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                                            <div className="flex-1">
                                               <div className="text-sm text-stone-700">
                                                  <strong>{req.requestedBy || 'Lojman Görevlisi'}</strong>, <strong>{reqStaff?.fullName || 'Bilinmeyen'}</strong> personelini {req.sourceRoomId ? 'oda değişikliği ile' : ''} <strong>{reqFacility?.name} - {reqRoom?.roomNumber}</strong> odasına yerleştirmek istiyor.
                                               </div>
                                               <div className="text-xs text-stone-500 bg-stone-100 p-2 rounded mt-2 border border-stone-200">
                                                  " {req.note} "
                                               </div>
                                            </div>
                                         </div>
                                         <div className="flex gap-2 justify-end mt-2">
                                            <button onClick={() => handleReject(req.id, req.staffId)} className="w-8 h-8 rounded-full flex items-center justify-center border border-red-200 text-red-500 hover:bg-red-50" title="Reddet">
                                               <X className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => reqRoom && handleApprove(req.id, req.staffId, reqRoom.facilityId, reqRoom.id)} className="w-8 h-8 rounded-full flex items-center justify-center border border-green-200 text-green-500 hover:bg-green-50" title="Onayla">
                                               <Check className="w-4 h-4" />
                                            </button>
                                         </div>
                                      </div>
                                   );
                                })}
                             </div>
                          )}
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="px-4 py-2 border-b border-stone-100">
                          <h4 className="font-bold text-sm text-[#2D332D]">Taleplerim ve Bildirimler</h4>
                       </div>
                       <div className="max-h-[300px] overflow-y-auto">
                          {myResolvedRequests.length === 0 ? (
                             <div className="p-4 text-center text-sm text-stone-500">Yeni bir bildiriminiz bulunmuyor.</div>
                          ) : (
                             <div className="divide-y divide-stone-100">
                                {myResolvedRequests.map(req => {
                                   const reqStaff = staff.find(s => s.id === req.staffId);
                                   const reqRoom = rooms.find(r => r.id === req.targetRoomId);
                                   const reqFacility = facilities.find(f => f.id === reqRoom?.facilityId);
                                   const isApproved = req.status === 'Onaylandı';
                                   
                                   return (
                                      <div key={req.id} className="p-4 flex flex-col gap-2 relative group hover:bg-stone-50 transition-colors">
                                         <div className="flex items-start gap-2">
                                            <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", isApproved ? "bg-green-500" : "bg-red-500")} />
                                            <div className="flex-1">
                                               <span className={cn("text-xs font-bold uppercase", isApproved ? "text-green-600" : "text-red-600")}>
                                                  {isApproved ? 'TALEBİNİZ ONAYLANDI' : 'TALEBİNİZ REDDEDİLDİ'}
                                               </span>
                                               <div className="text-sm text-stone-700 mt-1">
                                                  <strong>{reqStaff?.fullName || 'Bilinmeyen'}</strong> için yaptığınız <strong>{reqFacility?.name} - {reqRoom?.roomNumber || 'Bilinmeyen'}</strong> odasına oda değişikliği/yerleşim talebi İK tarafından <strong>{req.status.toLowerCase()}</strong>.
                                               </div>
                                            </div>
                                         </div>
                                         <div className="flex justify-end mt-1">
                                            <button 
                                               onClick={async () => {
                                                  await markApprovalRequestAsRead(req.id);
                                               }} 
                                               className="text-xs text-stone-500 hover:text-[#7C8363] border border-stone-200 hover:border-[#7C8363]/30 px-2 py-1 rounded-lg hover:bg-[#7C8363]/5 flex items-center gap-1 transition-all font-medium"
                                            >
                                               <Check className="w-3.5 h-3.5" /> Okundu
                                            </button>
                                         </div>
                                      </div>
                                   );
                                })}
                             </div>
                          )}
                       </div>
                     </>
                   )}
                </div>
             )}
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-x-3 pl-6 border-l border-stone-200 relative" ref={profileMenuRef}>
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-x-3 text-left hover:bg-stone-50 p-2 rounded-xl transition-colors focus:outline-none focus:bg-stone-50"
            >
              {currentUser && (
                 <div className="text-right hidden sm:block">
                   <p className="text-sm font-bold text-[#1A1C18]">{currentUser.fullName}</p>
                   <p className="text-[10px] text-stone-500 uppercase font-bold tracking-tighter">{getRoleName(currentUser.role)}</p>
                 </div>
              )}
              
              <div className="w-10 h-10 bg-[#E8E6E1] rounded-full overflow-hidden border-2 border-[#7C8363] flex items-center justify-center shrink-0">
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle className="h-8 w-8 text-stone-400" aria-hidden="true" />
                )}
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#E8E6E1] py-2 z-50 overflow-hidden transform origin-top-right transition-all">
                <div className="px-4 py-3 border-b border-stone-100">
                  <p className="text-sm font-bold text-stone-800 truncate">{currentUser?.fullName}</p>
                  <p className="text-xs text-stone-500 truncate">{currentUser?.email}</p>
                </div>
                
                <div className="py-1">
                  <Link 
                    to="/profile" 
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-stone-400" />
                    Profilim
                  </Link>
                </div>
                
                <div className="border-t border-stone-100 py-1">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Güvenli Çıkış
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Floating Notifications Toasts */}
      {myResolvedRequests.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
          {myResolvedRequests.map(req => {
            const reqStaff = staff.find(s => s.id === req.staffId);
            const reqRoom = rooms.find(r => r.id === req.targetRoomId);
            const reqFacility = facilities.find(f => f.id === reqRoom?.facilityId);
            const isApproved = req.status === 'Onaylandı';
            
            return (
              <div 
                key={req.id} 
                className="bg-white rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.15)] border border-[#E8E6E1] p-4 flex gap-3 items-start transform translate-y-0 transition-transform duration-300"
              >
                <div className={cn("p-2 rounded-xl shrink-0", isApproved ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                  {isApproved ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", isApproved ? "text-green-600" : "text-red-600")}>
                      {isApproved ? 'Oda Değişimi Onaylandı' : 'Oda Değişimi Reddedildi'}
                    </span>
                    <button 
                      onClick={() => markApprovalRequestAsRead(req.id)}
                      className="text-stone-400 hover:text-stone-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-stone-700 mt-1 leading-relaxed">
                    <strong>{reqStaff?.fullName || 'Bilinmeyen'}</strong> isimli personelin <strong>{reqFacility?.name} - {reqRoom?.roomNumber || 'Bilinmeyen'}</strong> odasına geçiş talebi İK Direktörü tarafından <strong>{req.status}</strong>.
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => markApprovalRequestAsRead(req.id)}
                      className="text-xs bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-xl font-medium transition-colors"
                    >
                      Anladım
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
