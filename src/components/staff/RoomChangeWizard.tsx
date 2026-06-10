import React, { useState, useMemo } from 'react';
import { Settings, ShieldAlert, DoorOpen, Users, BedDouble, AlertTriangle, ArrowRight, Home, Building, Check, X, Replace } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Staff, Room, Facility } from '../../types';
import { cn } from '../../lib/utils';
import { ROLE_NAMES } from '../../lib/permissions';

interface RoomChangeWizardProps {
  staff: Staff;
  currentRoomId: string;
  currentFacilityId: string;
  onClose: () => void;
}

export default function RoomChangeWizard({ staff, currentRoomId, currentFacilityId, onClose }: RoomChangeWizardProps) {
  const { 
    facilities, rooms, accommodations, staff: allStaff, 
    changeStaffRoom, addApprovalRequest, currentUser, rolesPermissions, hotels
  } = useStore();

  const [activeTab, setActiveTab] = useState<'same_dorm' | 'different_dorm'>('same_dorm');
  const [selectedTargetFacilityId, setSelectedTargetFacilityId] = useState<string>(currentFacilityId);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  
  const [filterGender, setFilterGender] = useState<'all' | 'male' | 'female' | 'Aile'>('all');
  const [showFullRooms, setShowFullRooms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentRolePerms = rolesPermissions.find(r => r.roleKey === currentUser?.role);
  const canApproveExceptions = currentUser?.role === 'super_admin' || currentRolePerms?.allowedFeatures.includes('approve_exceptions');

  const currentFacility = facilities.find(f => f.id === currentFacilityId);
  const currentRoom = rooms.find(r => r.id === currentRoomId);

  // Active accommodations calculation
  const getRoomOccupancy = (roomId: string) => {
    return accommodations.filter(a => a.roomId === roomId && a.status === 'active').length;
  };

  const getEffectiveGender = (roomId: string, defaultGender: string) => {
    const activeAccs = accommodations.filter(a => a.roomId === roomId && a.status === 'active');
    const residents = allStaff.filter(s => activeAccs.some(a => a.staffId === s.id));
    
    if (defaultGender === 'mixed') {
       if (residents.length === 0) return 'mixed';
       const hasFemale = residents.some(s => s.gender === 'female');
       const hasMale = residents.some(s => s.gender === 'male');
       if (hasFemale && hasMale) return 'mixed';
       return hasFemale ? 'female' : 'male';
    }
    return defaultGender;
  };

  const targetFacilityId = activeTab === 'same_dorm' ? currentFacilityId : selectedTargetFacilityId;
  const targetFacility = facilities.find(f => f.id === targetFacilityId);

  // Filtrelenmiş Odalar
  const availableRooms = useMemo(() => {
    if (!targetFacilityId) return [];
    
    return rooms.filter(room => {
      // Sadece seçili tesisteki aktif odalar
      if (room.facilityId !== targetFacilityId || room.status !== 'active') return false;
      // Kendi odasını listeden çıkar
      if (room.id === currentRoomId) return false;

      const occupancy = getRoomOccupancy(room.id);
      const effectiveGender = getEffectiveGender(room.id, room.genderType);

      // Dolu odalar kuralı
      if (!showFullRooms && occupancy >= room.bedCount && room.genderType !== 'Aile') return false;

      // Cinsiyet filtresi
      if (filterGender !== 'all') {
        if (filterGender === 'Aile' && room.genderType !== 'Aile') return false;
        if (filterGender !== 'Aile' && room.genderType !== 'Aile' && effectiveGender !== 'mixed' && effectiveGender !== filterGender) return false;
      }

      return true;
    });
  }, [targetFacilityId, rooms, filterGender, showFullRooms, accommodations, allStaff]);

  // Selected Room checks
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);
  let isException = false;
  let exceptionMessages: string[] = [];

  if (selectedRoom && targetFacility) {
    if (selectedRoom.genderType === 'Aile') {
      isException = true;
      exceptionMessages.push('Aile Odası yerleşimi talep ediliyor.');
    }
    
    // Cross-dorm exception
    if (!targetFacility.allowedHotelIds.includes(staff.hotelId)) {
      isException = true;
      if (currentUser?.role === 'super_admin' || currentUser?.role === 'hr_director') {
         // It's allowed with exception
         exceptionMessages.push('Çapraz Lojman (Sorumlu olmadığı lojmana) yerleşim yapılıyor.');
      } else {
         exceptionMessages.push('Çapraz Lojman: Bu personelin oteli bu lojman için yetkilendirilmemiş.');
      }
    }
  }

  const handleSubmit = async () => {
    if (!selectedRoomId || !targetFacilityId || !currentUser) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (isException && !canApproveExceptions) {
         // Create Approval Request
         await addApprovalRequest({
           staffId: staff.id,
           targetRoomId: selectedRoomId,
           sourceRoomId: currentRoomId,
           requestType: targetFacilityId === currentFacilityId ? 'family_placement' : 'cross_dorm_placement', // Use room_change/dorm_change internally 
           requestedBy: currentUser.fullName || currentUser.email,
           note: exceptionMessages.join(' ')
         });
         alert('İstisnai durum nedeniyle talebiniz İK onayına gönderildi.');
         onClose();
      } else {
         // Execute directly
         await changeStaffRoom(staff.id, currentRoomId, selectedRoomId, targetFacilityId);
         alert('Oda değişimi başarıyla tamamlandı.');
         onClose();
      }
    } catch (err: any) {
      setError(err.message || 'İşlem sırasında bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#E8E6E1] flex justify-between items-center bg-[#FDFCFB]">
          <div>
            <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
              <Replace className="w-5 h-5 text-[#7C8363]" />
              Oda ve Lojman Değişim Sihirbazı
            </h2>
            <p className="text-sm text-stone-500 mt-1">{staff.fullName} için yerleşim değişikliği yapıyorsunuz.</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <div className="flex bg-stone-50 border-b border-[#E8E6E1] px-6 pt-2">
           <button 
             onClick={() => { setActiveTab('same_dorm'); setSelectedRoomId(''); setFilterGender('all'); }}
             className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'same_dorm' ? "border-[#7C8363] text-[#7C8363]" : "border-transparent text-stone-500 hover:text-stone-700")}
           >
             Aynı Lojmanda Değişim
           </button>
           <button 
             onClick={() => { setActiveTab('different_dorm'); setSelectedTargetFacilityId(''); setSelectedRoomId(''); setFilterGender('all'); }}
             className={cn("px-4 py-3 text-sm font-semibold border-b-2 transition-colors", activeTab === 'different_dorm' ? "border-[#7C8363] text-[#7C8363]" : "border-transparent text-stone-500 hover:text-stone-700")}
           >
             Farklı Lojmana Transfer
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
           <div className="bg-stone-50 p-4 rounded-xl border border-[#E8E6E1] flex flex-col md:flex-row justify-between md:items-center gap-4">
             <div>
               <div className="text-xs font-semibold text-stone-500 uppercase">Mevcut Konum</div>
               <div className="font-bold text-stone-800 text-lg">{currentFacility?.name}</div>
               <div className="text-sm font-medium text-stone-600">{currentRoom ? `Oda: ${currentRoom.roomNumber} (${currentRoom.genderType === 'female' ? 'Kadın' : currentRoom.genderType === 'male' ? 'Erkek' : currentRoom.genderType === 'Aile' ? 'Aile' : 'Karma'})` : 'Bilinmiyor'}</div>
             </div>
             <ArrowRight className="w-6 h-6 text-stone-300 hidden md:block" />
             <div className="text-right">
                <div className="text-xs font-semibold text-stone-500 uppercase">Hedef Konum</div>
                {selectedRoom ? (
                  <>
                    <div className="font-bold text-[#7C8363] text-lg">{targetFacility?.name}</div>
                    <div className="text-sm font-medium text-[#7C8363]">Oda: {selectedRoom.roomNumber} ({selectedRoom.genderType === 'female' ? 'Kadın' : selectedRoom.genderType === 'male' ? 'Erkek' : selectedRoom.genderType === 'Aile' ? 'Aile' : 'Karma'})</div>
                  </>
                ) : (
                  <div className="text-sm font-medium text-stone-400 italic mt-1">Henüz oda seçilmedi</div>
                )}
             </div>
           </div>

           {activeTab === 'different_dorm' && (
             <div>
               <label className="block text-sm font-semibold text-stone-700 mb-2">Hedef Lojman Seçiniz</label>
               <select 
                 value={selectedTargetFacilityId}
                 onChange={e => { setSelectedTargetFacilityId(e.target.value); setSelectedRoomId(''); }}
                 className="w-full px-4 py-2.5 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
               >
                 <option value="">Lojman Seçin...</option>
                 {facilities.filter(f => f.id !== currentFacilityId && f.status === 'active').map(fac => (
                   <option key={fac.id} value={fac.id}>{fac.name}</option>
                 ))}
               </select>
             </div>
           )}

           {targetFacilityId && (
             <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="flex bg-stone-100 p-1 rounded-lg self-start">
                    {['all', 'male', 'female', 'Aile'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setFilterGender(g as any)}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-sm font-semibold transition-all",
                          filterGender === g 
                            ? "bg-white text-stone-800 shadow-sm" 
                            : "text-stone-500 hover:text-stone-700 hover:bg-stone-200/50"
                        )}
                      >
                        {g === 'all' ? 'Tümü' : g === 'male' ? 'Erkek' : g === 'female' ? 'Kız' : 'Aile'}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-stone-50 px-3 py-1.5 rounded-lg transition-colors">
                    <input 
                      type="checkbox" 
                      checked={showFullRooms}
                      onChange={e => setShowFullRooms(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7C8363] focus:ring-[#7C8363]"
                    />
                    <span className="font-semibold text-stone-600">Dolu Odaları da Göster</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                  {availableRooms.length === 0 ? (
                     <div className="col-span-full py-8 text-center text-stone-500 flex flex-col items-center">
                        <DoorOpen className="w-10 h-10 mb-3 opacity-20" />
                        Kriterlere uygun boş oda bulunamadı.
                     </div>
                  ) : (
                    availableRooms.map(room => {
                      const occupancy = getRoomOccupancy(room.id);
                      const isFull = occupancy >= room.bedCount && room.genderType !== 'Aile';
                      const effectiveGender = getEffectiveGender(room.id, room.genderType);
                      const isSelected = selectedRoomId === room.id;

                      return (
                        <div 
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden group",
                            isSelected 
                               ? "border-[#7C8363] bg-[#7C8363]/5" 
                               : "border-[#E8E6E1] bg-white hover:border-[#7C8363]/50 hover:shadow-sm"
                          )}
                        >
                           {/* İkon / Avatar */}
                           <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                <span className={cn(
                                   "px-2 py-0.5 rounded text-xs font-bold",
                                   room.genderType === 'male' ? "bg-blue-100 text-blue-700" :
                                   room.genderType === 'female' ? "bg-pink-100 text-pink-700" :
                                   room.genderType === 'Aile' ? "bg-purple-100 text-purple-700" :
                                   "bg-stone-100 text-stone-700"
                                )}>
                                   {room.genderType === 'female' ? 'Kadın' : room.genderType === 'male' ? 'Erkek' : room.genderType === 'Aile' ? 'Aile' : 'Karma'}
                                </span>
                             </div>
                             {isFull && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">DOLU</span>}
                           </div>

                           <div className="font-bold text-xl text-stone-800 mb-1">{room.roomNumber}</div>
                           
                           <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-stone-100/80">
                             <div className="text-stone-500 font-medium">Doluluk</div>
                             <div className={cn("font-bold flex items-center gap-1", isFull ? "text-red-600" : "text-[#7C8363]")}>
                               <Users className="w-4 h-4" />
                               {occupancy} / {room.bedCount}
                             </div>
                           </div>
                        </div>
                      );
                    })
                  )}
                </div>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-[#E8E6E1] bg-stone-50 flex flex-col gap-4">
           {error && (
             <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
               <ShieldAlert className="w-4 h-4" />
               {error}
             </div>
           )}

           {isException && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm mb-1">İstisnai Durum Uyarıları</h4>
                  <ul className="text-xs font-medium text-amber-700 list-disc list-inside space-y-0.5">
                    {exceptionMessages.map((msg, i) => <li key={i}>{msg}</li>)}
                  </ul>
                  {!canApproveExceptions && (
                    <p className="text-xs text-amber-800 mt-2 font-bold italic">Yetkiniz bulunmadığından bu işlem İK onayına düşecektir.</p>
                  )}
                </div>
              </div>
           )}

           <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-stone-600 hover:bg-stone-200 rounded-xl transition-colors">
                İptal Et
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!selectedRoomId || isLoading}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 text-white",
                  !selectedRoomId || isLoading ? "opacity-50 cursor-not-allowed bg-[#7C8363]" :
                  (isException && !canApproveExceptions) ? "bg-amber-600 hover:bg-amber-700" :
                  "bg-[#7C8363] hover:bg-[#6A7152]"
                )}
              >
                {isLoading ? 'İşleniyor...' : 
                 (isException && !canApproveExceptions) ? 'İK Onayına Gönder' : 
                 (isException && canApproveExceptions) ? 'İstisnayı Onayla ve Tamamla' : 'Değişimi Tamamla'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
