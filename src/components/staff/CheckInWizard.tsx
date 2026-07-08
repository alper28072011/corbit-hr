import React, { useState, useMemo } from 'react';
import { X, Search, Check, AlertTriangle, UserPlus, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Staff, Room, Accommodation, Facility, Hotel } from '../../types';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface CheckInWizardProps {
  staffMember: Staff;
  onClose: () => void;
}

export const getEffectiveRoomGender = (
  room: { genderType: string }, 
  currentResidents: { gender: string }[]
): 'male' | 'female' | 'mixed' | 'Aile' | 'empty' => {
  if (currentResidents.length === 0) {
    if (room.genderType === 'Aile') return 'Aile';
    return 'empty';
  }
  
  const hasFemale = currentResidents.some(r => r.gender === 'female');
  const hasMale = currentResidents.some(r => r.gender === 'male');
  
  if (hasFemale && hasMale) return 'mixed';
  if (hasFemale) return 'female';
  return 'male';
};

export default function CheckInWizard({ staffMember, onClose }: CheckInWizardProps) {
  const { facilities, rooms, accommodations, hotels, staff, placeStaff, currentUser, maintenanceTickets } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'empty' | 'partial'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalModal, setApprovalModal] = useState<{isOpen: boolean, roomId: string, facilityId: string, reason: string, requestType: 'family_placement' | 'cross_dorm_placement'} | null>(null);

  // Facility availability check based on user role and assignment
  const assignedFacilities = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return facilities;
    
    if (currentUser.role === 'facility_manager') {
      const userFacilityIds = currentUser.assignedFacilityIds || (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      return facilities.filter(f => userFacilityIds.includes(f.id));
    }
    return facilities;
  }, [currentUser, facilities]);

  // Determine allowed rooms
  const matchingRooms = useMemo(() => {
    let result = rooms.filter(r => 
      assignedFacilities.some(f => f.id === r.facilityId) && 
      r.status === 'active'
    );
    
    return result.map(room => {
      const facility = facilities.find(f => f.id === room.facilityId);
      const roomAccs = accommodations.filter(a => a.roomId === room.id && a.status === 'active');
      const currentResidents = staff.filter(s => roomAccs.some(a => a.staffId === s.id));
      
      const effectiveGender = getEffectiveRoomGender(room, currentResidents);
      
      const availableBeds = room.bedCount - currentResidents.length;
      
      const requiresCrossDormApproval = !facility?.allowedHotelIds.includes(staffMember.hotelId);
      const isFamilyRoom = room.genderType === 'Aile';
      
      const isRoomEmpty = currentResidents.length === 0;
      const roomCategory = isRoomEmpty ? null : (currentResidents[0].category || 'Personel');
      const roomIsForeigner = isRoomEmpty ? null : (currentResidents[0].isForeigner || false);

      // Category & Nationality Locks (Strict with defaults)
      if (!isRoomEmpty) {
        const staffCategory = staffMember.category || 'Personel';
        const staffForeigner = staffMember.isForeigner || false;
        if (roomCategory !== staffCategory) return null;
        if (roomIsForeigner !== staffForeigner) return null;
      }
      
      // Determine if there is a gender mismatch
      // Only check residents. If empty, no mismatch.
      let hasGenderMismatch = false;
      if (currentResidents.some(r => r.gender !== staffMember.gender)) {
        hasGenderMismatch = true;
      }

      const requiresFamilyApproval = isFamilyRoom || hasGenderMismatch;
      const requiresApproval = requiresCrossDormApproval || requiresFamilyApproval;
      
      const hasMaintenance = maintenanceTickets.some(m => m.roomId === room.id && (m.status === 'Açık' || m.status === 'İşlemde'));

      // Smart Suggest Logic: matching hotel, department, or position
      let recommendedScore = 0;
      if (currentResidents.some(r => r.hotelId === staffMember.hotelId)) recommendedScore += 1;
      if (currentResidents.some(r => r.department === staffMember.department)) recommendedScore += 1;
      if (!hasGenderMismatch && !isRoomEmpty) recommendedScore += 1; // Prefer rooms with same gender rather than empty
      
      return {
        ...room,
        facilityName: facility?.name || 'Bilinmeyen Lojman',
        effectiveGender,
        currentResidents,
        availableBeds,
        roomCategory,
        roomIsForeigner,
        requiresApproval,
        requiresCrossDormApproval,
        requiresFamilyApproval,
        isFamilyRoom,
        hasGenderMismatch,
        hasMaintenance,
        isRecommended: recommendedScore > 0 && !requiresApproval,
        recommendedScore
      };
    }).filter((r): r is any => r !== null && r.availableBeds > 0);
  }, [rooms, assignedFacilities, staffMember, facilities, accommodations, staff, maintenanceTickets]);

  const filteredAndSortedRooms = useMemo(() => {
    let filtered = matchingRooms.filter(r => {
      const matchesSearch = r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            r.facilityName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      
      if (filterType === 'empty') return r.availableBeds === r.bedCount;
      if (filterType === 'partial') return r.availableBeds < r.bedCount && r.availableBeds > 0;
      return true;
    });

    return filtered.sort((a, b) => {
      // Sort by room number ascending
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });

  }, [matchingRooms, searchQuery, filterType]);

  const { ownHotelFacilities, approvalRooms } = useMemo(() => {
    const ownRooms = filteredAndSortedRooms.filter(r => !r.requiresApproval);
    const approval = filteredAndSortedRooms.filter(r => r.requiresApproval);
    
    // Group ownRooms by facility
    const grouped = ownRooms.reduce((acc, room) => {
      if (!acc[room.facilityName]) {
        acc[room.facilityName] = [];
      }
      acc[room.facilityName].push(room);
      return acc;
    }, {} as Record<string, typeof ownRooms>);
    
    return { ownHotelFacilities: grouped, approvalRooms: approval };
  }, [filteredAndSortedRooms]);



  const handleInitPlacement = (roomId: string, facilityId: string, requiresApproval: boolean, isFamily: boolean) => {
     if (requiresApproval) {
        setApprovalModal({
           isOpen: true,
           roomId,
           facilityId,
           reason: '',
           requestType: isFamily ? 'family_placement' : 'cross_dorm_placement'
        });
     } else {
        handlePlaceStaff(roomId, facilityId, false);
     }
  };

  const handlePlaceStaff = async (roomId: string, facilityId: string, requiresApproval: boolean, requestType?: 'family_placement' | 'cross_dorm_placement', reason?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (requiresApproval) {
        // Create approval request instead of direct placement
        await useStore.getState().addApprovalRequest({
          staffId: staffMember.id,
          targetRoomId: roomId,
          requestType: requestType || 'cross_dorm_placement',
          requestedBy: currentUser?.fullName || currentUser?.email || 'System',
          requestedById: currentUser?.id,
          viewedByRequester: false,
          note: reason || ''
        });
        
        // Update staff status to pending_approval
        await useStore.getState().updateStaff(staffMember.id, { status: 'pending_approval' });
        
        alert("İK Onayı Gerekiyor! Talep gönderildi.");
      } else {
        await placeStaff(staffMember.id, facilityId, roomId);
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
      setApprovalModal(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 shrink-0 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
      >
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#E8E6E1] bg-[#FDFCFB] shrink-0">
          <div>
            <h3 className="text-xl font-bold text-[#2D332D] flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#7C8363]" />
              Akıllı Atama Sihirbazı
            </h3>
            <p className="text-sm text-stone-500 mt-1">Personel: <strong className="text-stone-700">{staffMember.fullName}</strong> ({staffMember.department})</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors bg-white hover:bg-stone-100 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {staffMember.specialNote && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 shrink-0">
             <div className="flex">
                <div className="flex-shrink-0">
                   <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                   <h3 className="text-sm font-bold text-red-800">İK Özel Notu / Lütfen Dikkat!</h3>
                   <div className="mt-1 text-sm text-red-700">
                      <p>{staffMember.specialNote}</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 bg-white border-b border-[#E8E6E1] flex gap-3 shrink-0 flex-col md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Oda no veya lojman ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
            />
          </div>
          <div className="flex bg-stone-100 p-1 rounded-xl">
             <button onClick={() => setFilterType('all')} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors", filterType === 'all' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}>Tümü</button>
             <button onClick={() => setFilterType('empty')} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors", filterType === 'empty' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}>Tamamen Boş</button>
             <button onClick={() => setFilterType('partial')} className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors", filterType === 'partial' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}>Kısmen Dolu</button>
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-50/50">
          {filteredAndSortedRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500">
              <Info className="w-12 h-12 mb-3 text-stone-300" />
              <p className="text-lg font-medium">Uygun oda bulunamadı</p>
              <p className="text-sm mt-1">Cinsiyet veya yetki kısıtlamaları nedeniyle eşleşen bir sonuç yok.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Own Hotel Facilities */}
              {Object.entries(ownHotelFacilities).length > 0 && (
                <div className="flex flex-col gap-6">
                  {Object.entries(ownHotelFacilities).map(([facilityName, _rooms]) => {
                    const rooms = _rooms as any[];
                    return (
                    <div key={facilityName}>
                      <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wider mb-3 px-1">{facilityName}</h4>
                      <div className="grid gap-3">
                        {rooms.map((room) => (
                          <div key={room.id} className={cn(
                            "p-4 rounded-xl border bg-white shadow-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center",
                            room.isRecommended ? "border-amber-300 bg-amber-50/10" : "border-[#E8E6E1] hover:border-[#7C8363]"
                          )}>
                            
                            {/* Room Status/Info */}
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-bold text-[#2D332D] text-lg">{room.roomNumber}</h4>
                                <span className="text-sm font-medium text-stone-500">· {room.facilityName}</span>
                                
                                <span className={cn(
                                   "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1 border",
                                   room.effectiveGender === 'female' ? "bg-pink-100 text-pink-700 border-pink-200" :
                                   room.effectiveGender === 'male' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                   room.effectiveGender === 'Aile' ? "bg-purple-100 text-purple-700 border-purple-200" :
                                   "bg-stone-100 text-stone-600 border-stone-200"
                                )}>
                                   {room.effectiveGender === 'female' ? 'Kız Odası' : 
                                    room.effectiveGender === 'male' ? 'Erkek Odası' : 
                                    room.effectiveGender === 'Aile' ? 'Aile Odası' : 
                                    room.effectiveGender === 'mixed' ? 'Karma' : 
                                    room.genderType === 'female' ? 'Kız Odası (Boş)' :
                                    room.genderType === 'male' ? 'Erkek Odası (Boş)' :
                                    'Karma (Boş)'}
                                </span>

                                {room.roomCategory && (
                                   <span className={cn("px-2 py-0.5 text-xs font-bold rounded border", 
                                      room.roomCategory === 'Stajyer' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                      room.roomCategory === 'Yönetici' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                      "bg-stone-100 text-stone-600 border-stone-200"
                                   )}>
                                      {room.roomCategory}
                                   </span>
                                )}

                                {room.roomIsForeigner !== null && (
                                   <span className={cn("px-2 py-0.5 text-xs font-bold rounded border",
                                      room.roomIsForeigner ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-teal-50 text-teal-600 border-teal-100"
                                   )}>
                                      {room.roomIsForeigner ? "Yabancı" : "Yerli"}
                                   </span>
                                )}

                                {room.isRecommended && (
                                  <span className="ml-0 md:ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Önerilen
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-sm text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                                <span>{room.block && `${room.block}`} {room.floor && `· ${room.floor}`}</span>
                                <span className={cn("font-medium", room.hasMaintenance ? "text-red-500 flex items-center gap-1" : "")}>
                                   {room.hasMaintenance && <AlertTriangle className="w-3 h-3"/>}
                                   {room.hasMaintenance ? "Açık Arıza Kaydı Var" : ""}
                                </span>
                              </div>

                              {/* Current Residents Summary */}
                              <div className="mt-3 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                  Mevcut Durum ({room.currentResidents.length} Kişi Kalıyor / {room.availableBeds} Boş Yatak)
                                </p>
                                {room.currentResidents.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                     {room.currentResidents.map((res: any) => (
                                       <div key={res.id} className="bg-white border border-stone-200 rounded-lg p-2 text-xs flex flex-col min-w-[180px] shadow-sm">
                                         <span className="font-bold text-stone-800">{res.fullName}</span>
                                         <div className="flex items-center gap-1.5 mt-1 text-stone-500 font-medium">
                                            <span className="truncate max-w-[100px]" title={res.department}>{res.department || 'Bilinmiyor'}</span>
                                            <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                                            <span className="truncate max-w-[100px]" title={res.position}>{res.position || 'Bilinmiyor'}</span>
                                         </div>
                                         {res.category && res.category !== 'Personel' && (
                                           <div className="mt-1">
                                             <span className={cn(
                                               "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                               res.category === 'Stajyer' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                                               res.category === 'Taşeron' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                               "bg-purple-50 text-purple-600 border border-purple-100"
                                             )}>
                                               {res.category}
                                             </span>
                                           </div>
                                         )}
                                       </div>
                                     ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-stone-400 italic">Oda şu an tamamen boş.</p>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-2">
                              {room.hasGenderMismatch && !room.isFamilyRoom && (
                                <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0"/> Cinsiyet Uyuşmazlığı
                                </div>
                              )}
                              {room.requiresFamilyApproval && !room.hasGenderMismatch && (
                                <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0"/> Aile Odası (Onay Gerekli)
                                </div>
                              )}
                              {room.requiresFamilyApproval && room.hasGenderMismatch && (
                                 <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0"/> İstisnai Yerleşim
                                 </div>
                              )}
                              {room.requiresCrossDormApproval && !room.requiresFamilyApproval && (
                                <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0"/> Farklı Lojman (Onay Gerekli)
                                </div>
                              )}
                              <button 
                                onClick={() => handleInitPlacement(room.id, room.facilityId, room.requiresApproval, room.requiresFamilyApproval || room.hasGenderMismatch)}
                                disabled={isSubmitting}
                                className={cn("w-full md:w-auto px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50",
                                  room.requiresApproval 
                                    ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                    : "bg-[#7C8363] hover:bg-[#6A7152] text-white"
                                )}
                              >
                                {room.requiresApproval ? "İK Onayına Gönder" : "Yerleştir"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}

              {/* Approval Rooms */}
              {approvalRooms.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <h4 className="text-sm font-bold text-amber-600 uppercase tracking-wider">İK Onayı Gerektiren Lojmanlar (Çapraz Seçim vb.)</h4>
                  </div>
                  <div className="grid gap-3 opacity-90">
                    {approvalRooms.map(room => (
                      <div key={room.id} className={cn(
                        "p-4 rounded-xl border bg-white shadow-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center",
                        room.isRecommended ? "border-amber-300 bg-amber-50/10" : "border-amber-100 hover:border-amber-300 bg-amber-50/30"
                      )}>
                        
                        {/* Room Status/Info */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-bold text-[#2D332D] text-lg">{room.roomNumber}</h4>
                            <span className="text-sm font-medium text-stone-500">· {room.facilityName}</span>
                            
                                <span className={cn(
                                   "px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider flex items-center gap-1 border",
                                   room.effectiveGender === 'female' ? "bg-pink-100 text-pink-700 border-pink-200" :
                                   room.effectiveGender === 'male' ? "bg-blue-100 text-blue-700 border-blue-200" :
                                   room.effectiveGender === 'Aile' ? "bg-purple-100 text-purple-700 border-purple-200" :
                                   "bg-stone-100 text-stone-600 border-stone-200"
                                )}>
                                   {room.effectiveGender === 'female' ? 'Kız Odası' : 
                                    room.effectiveGender === 'male' ? 'Erkek Odası' : 
                                    room.effectiveGender === 'Aile' ? 'Aile Odası' : 
                                    room.effectiveGender === 'mixed' ? 'Karma' : 
                                    room.genderType === 'female' ? 'Kız Odası (Boş)' :
                                    room.genderType === 'male' ? 'Erkek Odası (Boş)' :
                                    'Karma (Boş)'}
                                </span>

                            {room.roomCategory && (
                               <span className={cn("px-2 py-0.5 text-xs font-bold rounded border", 
                                  room.roomCategory === 'Stajyer' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                  room.roomCategory === 'Yönetici' ? "bg-purple-50 text-purple-600 border-purple-100" :
                                  "bg-stone-100 text-stone-600 border-stone-200"
                               )}>
                                  {room.roomCategory}
                               </span>
                            )}

                            {room.roomIsForeigner !== null && (
                               <span className={cn("px-2 py-0.5 text-xs font-bold rounded border",
                                  room.roomIsForeigner ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-teal-50 text-teal-600 border-teal-100"
                               )}>
                                  {room.roomIsForeigner ? "Yabancı" : "Yerli"}
                               </span>
                            )}

                            {room.isRecommended && (
                              <span className="ml-0 md:ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Önerilen
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                            <span>{room.block && `${room.block}`} {room.floor && `· ${room.floor}`}</span>
                            <span className={cn("font-medium", room.hasMaintenance ? "text-red-500 flex items-center gap-1" : "")}>
                               {room.hasMaintenance && <AlertTriangle className="w-3 h-3"/>}
                               {room.hasMaintenance ? "Açık Arıza Kaydı Var" : ""}
                            </span>
                          </div>

                          {/* Current Residents Summary */}
                          <div className="mt-3 bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                              Mevcut Durum ({room.currentResidents.length} Kişi Kalıyor / {room.availableBeds} Boş Yatak)
                            </p>
                            {room.currentResidents.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                 {room.currentResidents.map((res: any) => (
                                   <div key={res.id} className="bg-white border border-stone-200 rounded-lg p-2 text-xs flex flex-col min-w-[180px] shadow-sm">
                                     <span className="font-bold text-stone-800">{res.fullName}</span>
                                     <div className="flex items-center gap-1.5 mt-1 text-stone-500 font-medium">
                                        <span className="truncate max-w-[100px]" title={res.department}>{res.department || 'Bilinmiyor'}</span>
                                        <span className="w-1 h-1 rounded-full bg-stone-300"></span>
                                        <span className="truncate max-w-[100px]" title={res.position}>{res.position || 'Bilinmiyor'}</span>
                                     </div>
                                     {res.category && res.category !== 'Personel' && (
                                       <div className="mt-1">
                                         <span className={cn(
                                           "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                                           res.category === 'Stajyer' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                                           res.category === 'Taşeron' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                           "bg-purple-50 text-purple-600 border border-purple-100"
                                         )}>
                                           {res.category}
                                         </span>
                                       </div>
                                     )}
                                   </div>
                                 ))}
                              </div>
                            ) : (
                              <p className="text-sm text-stone-400 italic">Oda şu an tamamen boş.</p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-2">
                          {room.hasGenderMismatch && !room.isFamilyRoom && (
                            <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                              <AlertTriangle className="w-3 h-3 shrink-0"/> Cinsiyet Uyuşmazlığı
                            </div>
                          )}
                          {room.requiresFamilyApproval && !room.hasGenderMismatch && (
                            <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                              <AlertTriangle className="w-3 h-3 shrink-0"/> Aile Odası (Onay Gerekli)
                            </div>
                          )}
                          {room.requiresFamilyApproval && room.hasGenderMismatch && (
                             <div className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                                <AlertTriangle className="w-3 h-3 shrink-0"/> İstisnai Yerleşim
                             </div>
                          )}
                          {room.requiresCrossDormApproval && !room.requiresFamilyApproval && (
                            <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center mb-1">
                              <AlertTriangle className="w-3 h-3 shrink-0"/> Farklı Lojman (Onay Gerekli)
                            </div>
                          )}
                          <button 
                            onClick={() => handleInitPlacement(room.id, room.facilityId, room.requiresApproval, room.requiresFamilyApproval || room.hasGenderMismatch)}
                            disabled={isSubmitting}
                            className={cn("w-full md:w-auto px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50",
                              room.requiresApproval 
                                ? "bg-amber-500 hover:bg-amber-600 text-white" 
                                : "bg-[#7C8363] hover:bg-[#6A7152] text-white"
                            )}
                          >
                            {room.requiresApproval ? "İK Onayına Gönder" : "Yerleştir"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>

    {/* Approval Modal */}
      <AnimatePresence>
      {approvalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/60 p-4">
           <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
           >
              <h3 className="text-lg font-bold text-[#2D332D] mb-2">İK Onayına Gönder</h3>
              <p className="text-sm text-stone-500 mb-4">
                 Bu yerleşim için İnsan Kaynakları departmanının onayı gerekmektedir. İsterseniz onay talebiniz için ek bir gerekçe/not yazabilirsiniz.
              </p>
              <textarea
                 autoFocus
                 className="w-full border border-[#E8E6E1] rounded-xl p-3 text-sm focus:outline-none focus:border-[#7C8363] resize-none mb-4"
                 rows={4}
                 placeholder="Gerekçe veya açıklama yazabilirsiniz (Opsiyonel)..."
                 value={approvalModal.reason}
                 onChange={(e) => setApprovalModal({...approvalModal, reason: e.target.value})}
              />
              <div className="flex gap-2 justify-end">
                 <button 
                    onClick={() => setApprovalModal(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-stone-600 font-semibold text-sm hover:bg-stone-50 rounded-xl"
                 >
                    İptal
                 </button>
                 <button 
                    onClick={() => handlePlaceStaff(approvalModal.roomId, approvalModal.facilityId, true, approvalModal.requestType, approvalModal.reason)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 rounded-xl disabled:opacity-50"
                 >
                    Onaya Gönder
                 </button>
              </div>
           </motion.div>
        </div>
      )}
      </AnimatePresence>
    </>
  );
}
