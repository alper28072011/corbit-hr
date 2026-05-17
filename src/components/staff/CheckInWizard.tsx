import React, { useState, useMemo } from 'react';
import { X, Search, Check, AlertTriangle, UserPlus, Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';
import { Staff, Room, Accommodation, Facility, Hotel } from '../../types';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

interface CheckInWizardProps {
  staffMember: Staff;
  onClose: () => void;
}

export default function CheckInWizard({ staffMember, onClose }: CheckInWizardProps) {
  const { facilities, rooms, accommodations, hotels, staff, placeStaff, currentUser, maintenanceTickets } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'empty' | 'partial'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      r.status === 'active' && 
      (r.genderType === staffMember.gender || r.genderType === 'mixed')
    );
    
    return result.map(room => {
      const facility = facilities.find(f => f.id === room.facilityId);
      const roomAccs = accommodations.filter(a => a.roomId === room.id && a.status === 'active');
      const currentResidents = staff.filter(s => roomAccs.some(a => a.staffId === s.id));
      const availableBeds = room.bedCount - currentResidents.length;
      
      const requiresApproval = !facility?.allowedHotelIds.includes(staffMember.hotelId);
      
      const hasMaintenance = maintenanceTickets.some(m => m.roomId === room.id && (m.status === 'Açık' || m.status === 'İşlemde'));

      // Smart Suggest Logic: matching hotel, department, or position
      let recommendedScore = 0;
      if (currentResidents.some(r => r.hotelId === staffMember.hotelId)) recommendedScore += 1;
      if (currentResidents.some(r => r.department === staffMember.department)) recommendedScore += 1;
      
      return {
        ...room,
        facilityName: facility?.name || 'Bilinmeyen Lojman',
        currentResidents,
        availableBeds,
        requiresApproval,
        hasMaintenance,
        isRecommended: recommendedScore > 0,
        recommendedScore
      };
    }).filter(r => r.availableBeds > 0);
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
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.recommendedScore - a.recommendedScore;
    });

  }, [matchingRooms, searchQuery, filterType]);


  const handlePlaceStaff = async (roomId: string, facilityId: string, requiresApproval: boolean) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (requiresApproval) {
        // Create approval request instead of direct placement
        await addDoc(collection(db, 'approvalRequests'), {
          type: 'cross_dorm_placement',
          staffId: staffMember.id,
          targetFacilityId: facilityId,
          targetRoomId: roomId,
          requestedBy: currentUser?.id,
          requestedAt: new Date().toISOString(),
          status: 'pending',
          staffName: staffMember.fullName,
          hotelId: staffMember.hotelId,
          department: staffMember.department
        });
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 shrink-0 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
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
            <div className="grid gap-3">
              {filteredAndSortedRooms.map((room) => (
                <div key={room.id} className={cn(
                  "p-4 rounded-xl border bg-white shadow-sm transition-all flex flex-col md:flex-row gap-4 items-start md:items-center",
                  room.isRecommended ? "border-amber-300 bg-amber-50/10" : "border-[#E8E6E1] hover:border-[#7C8363]"
                )}>
                  
                  {/* Room Status/Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-[#2D332D] text-lg">{room.roomNumber}</h4>
                      <span className="text-sm font-medium text-stone-500">· {room.facilityName}</span>
                      {room.isRecommended && (
                        <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center gap-1">
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
                           {room.currentResidents.map(res => (
                             <span key={res.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-stone-200 rounded text-xs font-medium text-stone-700 shadow-sm">
                               {hotels.find(h => h.id === res.hotelId)?.name || 'Bilinmeyen'} / {res.department}
                             </span>
                           ))}
                        </div>
                      ) : (
                        <p className="text-sm text-stone-400 italic">Oda şu an tamamen boş.</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-full md:w-auto shrink-0 flex flex-col items-center gap-2">
                    {room.requiresApproval && (
                      <div className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-1 rounded flex items-center gap-1 max-w-[150px] text-center">
                        <AlertTriangle className="w-3 h-3 shrink-0"/> İK Onayı Gerekli
                      </div>
                    )}
                    <button 
                      onClick={() => handlePlaceStaff(room.id, room.facilityId, room.requiresApproval)}
                      disabled={isSubmitting}
                      className={cn("w-full md:w-auto px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50",
                        room.requiresApproval 
                          ? "bg-amber-500 hover:bg-amber-600 text-white" 
                          : "bg-[#7C8363] hover:bg-[#6A7152] text-white"
                      )}
                    >
                      {room.requiresApproval ? "Onaya Gönder" : "Yerleştir"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
