import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Search, Filter, ShieldAlert, Check, AlertCircle, 
  ArrowRight, User, Home, Calendar, HelpCircle, CornerDownRight, Trash2,
  Clock
} from "lucide-react";
import { useStore } from "../../store/useStore";
import { cn } from "../../lib/utils";
import { ApprovalRequest } from "../../types";

interface NotificationArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationArchiveModal({ isOpen, onClose }: NotificationArchiveModalProps) {
  const { 
    currentUser, approvalRequests, staff, rooms, facilities, 
    accommodations, resolveApprovalRequest, cancelApprovalRequest, hotels
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("all");

  const canManageApprovals = currentUser?.role === 'super_admin' || currentUser?.role === 'hr_director';

  // 1. Role-based filtering of the archive
  const filteredRequestsByRole = useMemo(() => {
    if (!currentUser) return [];

    let list = [...approvalRequests];

    if (currentUser.role === 'hotel_hr_manager') {
      // Hotel HR Managers see requests for staff belonging to their assigned hotels
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      list = list.filter(r => {
        const reqStaff = staff.find(s => s.id === r.staffId);
        return reqStaff?.hotelId && hotelIds.includes(reqStaff.hotelId);
      });
    } else if (currentUser.role === 'facility_manager') {
      // Facility Managers see requests they requested, or requests targetting rooms in facilities they manage
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      list = list.filter(r => {
        const isRequestedByMe = r.requestedById === currentUser.id || r.requestedBy === currentUser.email || r.requestedBy === currentUser.fullName;
        
        const reqRoom = rooms.find(room => room.id === r.targetRoomId);
        const isTargetFacilityManaged = reqRoom && facIds.includes(reqRoom.facilityId);

        return isRequestedByMe || isTargetFacilityManaged;
      });
    }

    // Sort chronologically (newest first)
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [approvalRequests, currentUser, staff, rooms]);

  // 2. Search and filter logic
  const finalRequests = useMemo(() => {
    return filteredRequestsByRole.filter(req => {
      const reqStaff = staff.find(s => s.id === req.staffId);
      const reqRoom = rooms.find(r => r.id === req.targetRoomId);
      const reqFacility = facilities.find(f => f.id === reqRoom?.facilityId);
      
      const staffName = (reqStaff?.fullName || "").toLowerCase();
      const requesterName = (req.requestedBy || "").toLowerCase();
      const roomNum = (reqRoom?.roomNumber || "").toLowerCase();
      const facName = (reqFacility?.name || "").toLowerCase();
      const noteText = (req.note || "").toLowerCase();
      const search = searchQuery.toLowerCase();

      // Search match
      const matchesSearch = 
        staffName.includes(search) || 
        requesterName.includes(search) || 
        roomNum.includes(search) || 
        facName.includes(search) ||
        noteText.includes(search);

      // Status filter
      const matchesStatus = statusFilter === "all" || req.status === statusFilter;

      // Request type filter
      const matchesType = requestTypeFilter === "all" || req.requestType === requestTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [filteredRequestsByRole, searchQuery, statusFilter, requestTypeFilter, staff, rooms, facilities]);

  // Helper to resolve hotel name
  const getHotelName = (hotelId?: string) => {
    if (!hotelId) return "Bilinmeyen Otel";
    const hotel = hotels.find(h => h.id === hotelId);
    return hotel ? hotel.name : "Bilinmeyen Otel";
  };

  // Helper to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Find other residents of a room to give rich context
  const getRoomResidentsText = (roomId: string, staffIdToExclude: string) => {
    const activeAccs = accommodations.filter(a => a.roomId === roomId && a.status === 'active' && a.staffId !== staffIdToExclude);
    if (activeAccs.length === 0) return "Şu an boş (Sakin yok)";

    const residents = activeAccs.map(acc => {
      const s = staff.find(sm => sm.id === acc.staffId);
      if (!s) return null;
      const genderStr = s.gender === 'female' ? 'Kadın' : 'Erkek';
      return `${s.fullName} (${genderStr})`;
    }).filter(Boolean);

    return residents.join(", ");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#FCFBF9] rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-[#E8E6E1]"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-[#E8E6E1] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center border border-stone-200">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Onay Talepleri ve Bildirim Arşivi</h2>
                  <p className="text-xs text-stone-500">
                    {canManageApprovals 
                      ? "Tüm lojmanlardaki onay bekleyen ve sonuçlandırılmış istisnai yerleşim süreçleri."
                      : "Yetki alanınızdaki lojman talepleri ve bildirim geçmişiniz."
                    }
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-50 transition-colors border border-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="px-6 py-4 bg-white border-b border-[#E8E6E1] flex flex-col md:flex-row gap-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Personel adı, lojman adı, oda veya gerekçe ara..."
                  className="w-full bg-stone-50 border border-[#E8E6E1] rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#7C8363] focus:bg-white transition-all text-stone-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-stone-50 border border-[#E8E6E1] rounded-xl px-3 py-1.5">
                  <Filter className="w-3.5 h-3.5 text-stone-500" />
                  <select
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none text-stone-700 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Tüm Durumlar</option>
                    <option value="Bekliyor">Bekliyor (Aktif)</option>
                    <option value="Onaylandı">Onaylandı</option>
                    <option value="Reddedildi">Reddedildi</option>
                    <option value="İptal Edildi">İptal Edildi</option>
                  </select>
                </div>

                {/* Request Type Filter */}
                <div className="flex items-center gap-1.5 bg-stone-50 border border-[#E8E6E1] rounded-xl px-3 py-1.5">
                  <select
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none text-stone-700 cursor-pointer"
                    value={requestTypeFilter}
                    onChange={(e) => setRequestTypeFilter(e.target.value)}
                  >
                    <option value="all">Tüm İstisna Türleri</option>
                    <option value="family_placement">Potansiyel Aile Odası</option>
                    <option value="cross_dorm_placement">Çapraz Lojman</option>
                    <option value="room_change">Oda Değişikliği</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Request Cards Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {finalRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8E6E1] p-12 text-center">
                  <AlertCircle className="w-8 h-8 text-stone-400 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-800">Kayıt Bulunamadı</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                    Seçili arama kriterlerine uygun onay talebi ya da geçmiş bildirim kaydı bulunamadı.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {finalRequests.map(req => {
                    const reqStaff = staff.find(s => s.id === req.staffId);
                    const reqRoom = rooms.find(r => r.id === req.targetRoomId);
                    const reqFacility = facilities.find(f => f.id === reqRoom?.facilityId);
                    
                    // Source room details
                    const sourceRoom = req.sourceRoomId ? rooms.find(r => r.id === req.sourceRoomId) : null;
                    const sourceFacility = sourceRoom ? facilities.find(f => f.id === sourceRoom.facilityId) : null;

                    // Parse parts of note
                    const noteParts = req.note ? req.note.split(" | Talep Notu: ") : ["", ""];
                    const systemReasons = noteParts[0];
                    const customNoteText = noteParts[1];

                    const isPending = req.status === "Bekliyor";
                    const isApproved = req.status === "Onaylandı";
                    const isRejected = req.status === "Reddedildi";
                    const isCancelled = req.status === "İptal Edildi";

                    return (
                      <div 
                        key={req.id} 
                        className={cn(
                          "bg-white rounded-2xl border p-5 flex flex-col md:flex-row md:items-start gap-6 transition-all shadow-sm hover:shadow-md",
                          isPending ? "border-amber-200 bg-amber-50/10 shadow-amber-50/50" : "border-[#E8E6E1]"
                        )}
                      >
                        {/* Status Icon Column */}
                        <div className="flex md:flex-col items-center justify-between md:justify-start gap-3 shrink-0">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border",
                            isPending && "bg-amber-100/80 border-amber-200 text-amber-600 animate-pulse",
                            isApproved && "bg-green-100/80 border-green-200 text-green-600",
                            isRejected && "bg-red-100/80 border-red-200 text-red-600",
                            isCancelled && "bg-stone-100 border-stone-200 text-stone-500"
                          )}>
                            {isPending && <Clock className="w-5 h-5" />}
                            {isApproved && <Check className="w-5 h-5" />}
                            {isRejected && <X className="w-5 h-5" />}
                            {isCancelled && <X className="w-5 h-5" />}
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-center min-w-[80px]",
                            isPending && "bg-amber-100 text-amber-800",
                            isApproved && "bg-green-100 text-green-800",
                            isRejected && "bg-red-100 text-red-800",
                            isCancelled && "bg-stone-100 text-stone-700"
                          )}>
                            {req.status}
                          </span>
                        </div>

                        {/* Details Grid Column */}
                        <div className="flex-1 space-y-4">
                          {/* Staff and General info */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-bold text-stone-900">{reqStaff?.fullName || "Bilinmeyen Personel"}</span>
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                  reqStaff?.gender === 'female' ? "bg-pink-50 text-pink-700 border border-pink-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                                )}>
                                  {reqStaff?.gender === 'female' ? 'Kadın' : 'Erkek'}
                                </span>
                              </div>
                              <p className="text-xs text-stone-500 font-medium mt-0.5">
                                Oteli: <strong className="text-stone-700">{getHotelName(reqStaff?.hotelId)}</strong>
                              </p>
                            </div>
                            <div className="text-right sm:text-right">
                              <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-1 rounded-md uppercase tracking-wider">
                                {req.requestType === 'family_placement' ? 'POTANSİYEL AİLE YERLEŞİMİ' : 'ÇAPRAZ LOJMAN TALEBİ'}
                              </span>
                              <p className="text-[10px] text-stone-400 mt-1 flex items-center justify-end gap-1">
                                <Calendar className="w-3 h-3" /> {formatDate(req.createdAt)}
                              </p>
                            </div>
                          </div>

                          {/* Lodging move vector */}
                          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200/60 grid grid-cols-1 sm:grid-cols-5 items-center gap-3">
                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-stone-400 uppercase block tracking-wider mb-0.5">Önceki Konum</span>
                              {sourceRoom ? (
                                <div>
                                  <span className="text-xs font-bold text-stone-800">{sourceFacility?.name}</span>
                                  <span className="text-xs font-medium text-stone-500 block">Oda: {sourceRoom.roomNumber} ({sourceRoom.block} / {sourceRoom.floor})</span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-amber-600 block">Yeni Kayıt / İlk Yerleşim</span>
                              )}
                            </div>
                            
                            <div className="flex justify-start sm:justify-center items-center">
                              <div className="w-8 h-8 rounded-full bg-stone-200/50 flex items-center justify-center text-stone-500">
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>

                            <div className="sm:col-span-2">
                              <span className="text-[9px] font-bold text-[#7C8363] uppercase block tracking-wider mb-0.5">Hedef Konum</span>
                              {reqRoom ? (
                                <div>
                                  <span className="text-xs font-bold text-stone-800">{reqFacility?.name}</span>
                                  <span className="text-xs font-medium text-stone-500 block">Oda: {reqRoom.roomNumber} ({reqRoom.block} / {reqRoom.floor})</span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-red-500 block">Belirlenmemiş</span>
                              )}
                            </div>
                          </div>

                          {/* Target Room Sakinleri (Rich Context) */}
                          {reqRoom && (
                            <div className="bg-[#FCFBF9] border border-[#E8E6E1] rounded-xl p-3">
                              <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                <User className="w-3.5 h-3.5 text-stone-400" /> Hedef Odadaki Diğer Kişiler
                              </h4>
                              <p className="text-xs text-stone-700 font-medium">
                                {getRoomResidentsText(req.targetRoomId, req.staffId)}
                              </p>
                            </div>
                          )}

                          {/* Reason and custom note details */}
                          <div className="space-y-2">
                            {systemReasons && (
                              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="text-[10px] font-bold text-amber-800 uppercase block tracking-wider">İstisna Gerekçesi</span>
                                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed font-medium">
                                    {systemReasons}
                                  </p>
                                </div>
                              </div>
                            )}

                            {customNoteText ? (
                              <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3 flex gap-2">
                                <CornerDownRight className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Görevlinin Açıklaması / Notu</span>
                                  <p className="text-xs text-stone-800 mt-0.5 italic font-medium">
                                    "{customNoteText}"
                                  </p>
                                </div>
                              </div>
                            ) : (
                              req.note && !systemReasons && (
                                <div className="bg-stone-50 border border-stone-200/60 rounded-xl p-3 flex gap-2">
                                  <CornerDownRight className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Talep Açıklaması</span>
                                    <p className="text-xs text-stone-800 mt-0.5 italic font-medium">
                                      "{req.note}"
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* Requester info & decisions log */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px] text-stone-500 font-medium">
                            <div>
                              Talep Eden: <strong className="text-stone-700">{req.requestedBy}</strong>
                            </div>
                            
                            {/* Action Row for HR Director or Requester */}
                            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                              {isPending && canManageApprovals && (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => resolveApprovalRequest(req.id, "Reddedildi")}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors border border-red-200/50 flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" /> Reddet
                                  </button>
                                  <button 
                                    onClick={() => reqRoom && resolveApprovalRequest(req.id, "Onaylandı")}
                                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-bold transition-colors border border-green-200/50 flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Onayla
                                  </button>
                                </div>
                              )}

                              {isPending && !canManageApprovals && (req.requestedById === currentUser.id || req.requestedBy === currentUser.email) && (
                                <button 
                                  onClick={() => cancelApprovalRequest(req.id, req.staffId)}
                                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg text-xs font-bold transition-colors border border-stone-200/60 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Talebi İptal Et
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-[#E8E6E1] flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
              >
                Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
