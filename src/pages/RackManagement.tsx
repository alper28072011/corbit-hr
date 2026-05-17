import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/layout/PageHeader';
import { cn } from '../lib/utils';
import { 
  Search, X, LayoutGrid, LayoutList, Grip, Users, 
  BedSingle, AlertTriangle, LogOut, CheckCircle, Wrench, ShieldAlert
} from 'lucide-react';
import { hasPermission, PERMISSION_KEYS } from '../lib/permissions';

export default function RackManagement() {
  const { facilities, rooms, staff, accommodations, maintenanceTickets, currentUser, roles } = useStore();

  // Security check
  if (!hasPermission(currentUser?.role, PERMISSION_KEYS.view_rack_management, roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [viewMode, setViewMode] = useState<'rack' | 'card' | 'list'>('rack');

  // Selected Room for Modal
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const availableFacilities = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return facilities;
    if (currentUser.role === 'facility_manager') {
      const userFacilityIds = currentUser.assignedFacilityIds || [];
      return facilities.filter(f => userFacilityIds.includes(f.id));
    }
    return facilities;
  }, [facilities, currentUser]);

  const EnrichedRooms = useMemo(() => {
    return rooms.map(room => {
      const activeAccs = accommodations.filter(a => a.roomId === room.id && a.status === 'active');
      const currentResidents = staff.filter(s => activeAccs.some(a => a.staffId === s.id));
      const openMaintenance = maintenanceTickets.filter(m => m.roomId === room.id && (m.status === 'Açık' || m.status === 'İşlemde'));
      const hasMaintenance = openMaintenance.length > 0;

      const currentOccupancy = currentResidents.length;
      const isFull = currentOccupancy >= room.bedCount;
      const isEmpty = currentOccupancy === 0;

      let status = 'empty';
      if (hasMaintenance) {
         status = 'maintenance';
      } else if (isFull) {
         status = 'full';
      } else if (!isEmpty) {
         status = 'partial';
      }

      return {
        ...room,
        currentResidents,
        currentOccupancy,
        statusGroup: status, // empty, partial, full, maintenance
        openMaintenance,
        hasMaintenance
      };
    });
  }, [rooms, accommodations, staff, maintenanceTickets]);

  const filteredRooms = useMemo(() => {
    return EnrichedRooms.filter(room => {
      if (filterFacility && room.facilityId !== filterFacility) return false;
      if (filterGender && room.genderType !== filterGender) return false;
      if (filterStatus !== 'all') {
         if (filterStatus === 'maintenance' && !room.hasMaintenance) return false;
         if (filterStatus === 'empty' && room.statusGroup !== 'empty') return false;
         if (filterStatus === 'partial' && room.statusGroup !== 'partial') return false;
         if (filterStatus === 'full' && room.statusGroup !== 'full') return false;
      }
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesRoom = room.roomNumber.toLowerCase().includes(q);
        const matchesResident = room.currentResidents.some(s => s.fullName.toLowerCase().includes(q));
        if (!matchesRoom && !matchesResident) return false;
      }

      return true;
    }).sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  }, [EnrichedRooms, filterFacility, filterGender, filterStatus, searchQuery]);

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterFacility('');
    setFilterGender('');
  };

  const selectedRoomDetails = useMemo(() => {
    if (!selectedRoomId) return null;
    return EnrichedRooms.find(r => r.id === selectedRoomId) || null;
  }, [selectedRoomId, EnrichedRooms]);

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="shrink-0">
        <PageHeader
          title="Oda Doluluk (Rack)"
          description="Odaların anlık doluluk durumlarını, kapasitelerini ve arıza kayıtlarını yönetin."
        />
      </div>

      <div className="card-standard p-4 flex flex-col md:flex-row gap-4 bg-[#FDFCFB] shrink-0">
         <div className="flex bg-stone-100 p-1 rounded-xl shrink-0 self-start">
            <button 
              onClick={() => setViewMode('rack')} 
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", viewMode === 'rack' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}
            >
              <LayoutGrid className="w-4 h-4" /> Rack
            </button>
            <button 
              onClick={() => setViewMode('card')} 
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", viewMode === 'card' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}
            >
              <Grip className="w-4 h-4" /> Kart
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={cn("px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2", viewMode === 'list' ? 'bg-white shadow-sm text-[#2D332D]' : 'text-stone-500 hover:text-stone-700')}
            >
              <LayoutList className="w-4 h-4" /> Liste
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Oda no veya personel ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-2 shrink-0">
             <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
               <option value="all">Tüm Durumlar</option>
               <option value="empty">Tamamen Boş</option>
               <option value="partial">Kısmi Boş</option>
               <option value="full">Tam Dolu</option>
               <option value="maintenance">Arızalı</option>
             </select>
             <select value={filterFacility} onChange={e => setFilterFacility(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
               <option value="">Tüm Lojmanlar</option>
               {availableFacilities.map(f => (
                 <option key={f.id} value={f.id}>{f.name}</option>
               ))}
             </select>
             <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
               <option value="">Tüm Cinsiyetler</option>
               <option value="male">Erkek</option>
               <option value="female">Kadın</option>
               <option value="mixed">Karma</option>
             </select>
             {(searchQuery || filterStatus !== 'all' || filterFacility || filterGender) && (
               <button onClick={resetFilters} className="p-2 text-stone-400 hover:text-stone-700 bg-white border border-[#E8E6E1] hover:bg-stone-50 rounded-xl transition-colors shrink-0 shadow-sm">
                 <X className="w-5 h-5" />
               </button>
             )}
          </div>
      </div>

      <div className="card-standard flex flex-col bg-white">
          <div className="p-6 bg-[#FDFCFB]">
            {availableFacilities.map(facility => {
               const facRooms = filteredRooms.filter(r => r.facilityId === facility.id && r.status === 'active');
               if (facRooms.length === 0) return null;

               return (
                 <div key={facility.id} className="mb-10 last:mb-0">
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-stone-200">
                       <h3 className="text-xl font-bold text-[#2D332D]">{facility.name}</h3>
                       <span className="px-2.5 py-1 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold">{facRooms.length} Oda Bulundu</span>
                    </div>

                    {viewMode === 'rack' && (
                       <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-3">
                           {facRooms.map(room => (
                             <button
                               key={room.id}
                               onClick={() => setSelectedRoomId(room.id)}
                               className={cn(
                                 "aspect-square rounded-xl shadow-sm border relative overflow-hidden flex flex-col items-center justify-center transition-transform hover:scale-105 hover:shadow-md group",
                                 room.hasMaintenance ? "border-stone-400 bg-stone-100/50" :
                                 room.statusGroup === 'empty' ? "border-green-200 bg-green-50" :
                                 room.statusGroup === 'full' ? "border-red-200 bg-red-50" :
                                 "border-orange-200 bg-orange-50"
                               )}
                               style={room.hasMaintenance ? { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px)' } : {}}
                             >
                                <span className={cn(
                                   "font-bold text-lg font-mono",
                                   room.hasMaintenance ? "text-stone-600" :
                                   room.statusGroup === 'empty' ? "text-green-700" :
                                   room.statusGroup === 'full' ? "text-red-700" :
                                   "text-orange-700"
                                )}>{room.roomNumber}</span>
                                <span className="text-[10px] font-semibold text-stone-500 mt-1">{room.currentOccupancy}/{room.bedCount}</span>
                                
                                {/* Gender Indicator */}
                                <div className={cn(
                                   "absolute top-1.5 right-1.5 text-[8px] font-bold uppercase w-4 h-4 flex items-center justify-center rounded-md leading-none shadow-sm",
                                   room.genderType === 'female' ? "bg-pink-100 text-pink-700" : 
                                   room.genderType === 'male' ? "bg-blue-100 text-blue-700" : 
                                   "bg-purple-100 text-purple-700"
                                )}>
                                   {room.genderType === 'female' ? 'K' : room.genderType === 'male' ? 'E' : 'X'}
                                </div>

                                {/* Tooltip */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-20 pointer-events-none">
                                  <div className="bg-gray-800 text-white text-xs rounded-lg p-3 shadow-xl before:content-[''] before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-gray-800">
                                     <p className="font-semibold text-gray-400 mb-1 border-b border-gray-700 pb-1">Konaklayanlar</p>
                                     {room.currentResidents.length > 0 ? (
                                        <ul className="space-y-1 text-left">
                                           {room.currentResidents.map((r, i) => (
                                              <li key={i} className="flex gap-1.5 items-start">
                                                 <div className="w-1.5 h-1.5 rounded-full bg-[#7C8363] mt-1 shrink-0" />
                                                 <span><span className="font-semibold">{r.fullName}</span> <span className="opacity-70 text-[10px]">({r.department})</span></span>
                                              </li>
                                           ))}
                                        </ul>
                                     ) : (
                                       <span className="text-gray-400 italic">Oda boş</span>
                                     )}
                                     {room.hasMaintenance && <p className="text-red-400 mt-2 font-semibold">! Açık arıza mevcut</p>}
                                  </div>
                                </div>
                             </button>
                           ))}
                       </div>
                    )}

                    {viewMode === 'card' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {facRooms.map(room => (
                             <div key={room.id} className="relative bg-white border border-[#E8E6E1] rounded-xl p-5 shadow-sm hover:shadow-md cursor-pointer transition-all" onClick={() => setSelectedRoomId(room.id)}>
                               <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold font-mono text-[#2D332D]">{room.roomNumber}</span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                        room.genderType === 'female' ? "bg-pink-50 text-pink-700" : 
                                        room.genderType === 'male' ? "bg-blue-50 text-blue-700" : 
                                        "bg-purple-50 text-purple-700"
                                      )}>
                                        {room.genderType === 'female' ? 'Kadın' : room.genderType === 'male' ? 'Erkek' : 'Karma'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-stone-500">{room.block ? `${room.block} Blok` : ''} {room.floor ? `${room.floor}. Kat` : ''}</span>
                                  </div>
                                  <div className={cn(
                                     "flex flex-col items-end",
                                     room.statusGroup === 'full' ? "text-red-600" : (room.statusGroup === 'empty' ? "text-green-600" : "text-orange-500")
                                  )}>
                                     <span className="text-xl font-bold font-mono leading-none">{room.currentOccupancy}<span className="text-stone-400 text-sm">/{room.bedCount}</span></span>
                                  </div>
                               </div>

                               <div className="flex gap-1 mb-4 flex-wrap">
                                  {Array.from({length: room.bedCount}).map((_, i) => (
                                     <BedSingle key={i} className={cn("w-5 h-5", i < room.currentOccupancy ? "text-stone-800" : "text-stone-200")} />
                                  ))}
                               </div>

                               <div className="flex flex-col gap-1.5 pt-4 border-t border-stone-100">
                                  {room.currentResidents.slice(0, 3).map((r, i) => (
                                      <div key={i} className="text-xs font-medium text-stone-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-stone-400" />{r.fullName}</div>
                                  ))}
                                  {room.currentResidents.length > 3 && (
                                     <div className="text-[10px] font-bold text-stone-400 italic">+{room.currentResidents.length - 3} kişi daha</div>
                                  )}
                                  {room.currentResidents.length === 0 && <span className="text-xs text-stone-400 italic">Boş oda</span>}
                               </div>

                               {room.hasMaintenance && <AlertTriangle className="absolute bottom-4 right-4 w-5 h-5 text-red-500" />}
                             </div>
                          ))}
                       </div>
                    )}

                    {viewMode === 'list' && (
                       <div className="overflow-x-auto border border-[#E8E6E1] rounded-xl bg-white shadow-sm">
                         <table className="min-w-full text-left w-full whitespace-nowrap">
                            <thead className="bg-[#FDFCFB] border-b border-[#E8E6E1]">
                              <tr>
                                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Oda No</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Cinsiyet</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Kapasite</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase">Durum</th>
                                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase w-full">Personeller</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E8E6E1]">
                               {facRooms.map(room => (
                                  <tr key={room.id} className="hover:bg-stone-50 cursor-pointer transition-colors" onClick={() => setSelectedRoomId(room.id)}>
                                     <td className="px-6 py-4 font-bold font-mono text-[#2D332D]">{room.roomNumber}</td>
                                     <td className="px-6 py-4">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                          room.genderType === 'female' ? "bg-pink-50 text-pink-700" : 
                                          room.genderType === 'male' ? "bg-blue-50 text-blue-700" : 
                                          "bg-purple-50 text-purple-700"
                                        )}>
                                          {room.genderType === 'female' ? 'Kadın' : room.genderType === 'male' ? 'Erkek' : 'Karma'}
                                        </span>
                                     </td>
                                     <td className="px-6 py-4 text-sm text-stone-600">{room.currentOccupancy} / {room.bedCount} Yatak</td>
                                     <td className="px-6 py-4">
                                        <span className={cn("px-2 py-1 rounded text-xs font-bold", 
                                            room.hasMaintenance ? "bg-stone-100 text-stone-600" :
                                            room.statusGroup === 'empty' ? "bg-green-50 text-green-700" :
                                            room.statusGroup === 'full' ? "bg-red-50 text-red-700" :
                                            "bg-orange-50 text-orange-700"
                                        )}>
                                          {room.hasMaintenance ? "Arızalı" : room.statusGroup === 'empty' ? "Boş" : room.statusGroup === 'full' ? "Tam Dolu" : "Kısmi Dolu"}
                                        </span>
                                     </td>
                                     <td className="px-6 py-4 text-sm text-stone-600 whitespace-normal min-w-[200px]">
                                        <div className="flex flex-wrap gap-1.5">
                                          {room.currentResidents.map(r => (
                                            <span key={r.id} className="inline-flex items-center gap-1 bg-stone-100 px-2 py-1 rounded-md text-xs font-medium border border-stone-200">
                                              <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                              {r.fullName}
                                            </span>
                                          ))}
                                          {room.currentResidents.length === 0 && <span className="text-stone-400 italic">Boş oda</span>}
                                        </div>
                                     </td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                       </div>
                    )}
                 </div>
               )
            })}
            
            {availableFacilities.every(facility => filteredRooms.filter(r => r.facilityId === facility.id && r.status === 'active').length === 0) && (
               <div className="flex flex-col items-center justify-center p-12 text-stone-500 bg-white rounded-xl border border-dashed border-stone-300">
                  <LayoutGrid className="w-12 h-12 mb-4 text-stone-300" />
                  <p className="text-sm font-medium">Bu kriterlere uygun oda bulunamadı.</p>
               </div>
            )}
          </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoomId && selectedRoomDetails && (
         <div className="fixed inset-0 z-50 flex items-center justify-end bg-stone-900/60 p-4 transition-all">
           <div className="bg-white h-full w-full max-w-md rounded-l-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-10">
              <div className="flex justify-between items-center p-6 border-b border-[#E8E6E1] bg-[#FDFCFB] shrink-0">
                 <div>
                   <h2 className="text-2xl font-black font-mono text-[#2D332D] mb-1">Oda {selectedRoomDetails.roomNumber}</h2>
                   <p className="text-sm text-stone-500">{facilities.find(f => f.id === selectedRoomDetails.facilityId)?.name}</p>
                 </div>
                 <button onClick={() => setSelectedRoomId(null)} className="text-stone-400 hover:text-stone-600 transition-colors bg-white hover:bg-stone-100 p-2 rounded-full shadow-sm">
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* Capacity Overview */}
                 <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Doluluk Durumu</p>
                      <p className="text-lg font-bold text-[#2D332D]">{selectedRoomDetails.currentOccupancy} / {selectedRoomDetails.bedCount} <span className="text-sm font-medium text-stone-500">Yatak Dolu</span></p>
                    </div>
                    <div className={cn("px-3 py-1 rounded-lg text-sm font-bold shadow-sm",
                        selectedRoomDetails.statusGroup === 'empty' ? "bg-green-100 text-green-800" :
                        selectedRoomDetails.statusGroup === 'full' ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                    )}>
                        {Math.round((selectedRoomDetails.currentOccupancy / selectedRoomDetails.bedCount) * 100)}%
                    </div>
                 </div>

                 {/* Residents List */}
                 <div>
                    <h3 className="text-sm font-bold text-[#2D332D] flex items-center gap-2 mb-3 border-b pb-2"><Users className="w-4 h-4 text-[#7C8363]" /> Konaklayanlar ({selectedRoomDetails.currentOccupancy})</h3>
                    {selectedRoomDetails.currentResidents.length > 0 ? (
                       <ul className="space-y-3">
                         {selectedRoomDetails.currentResidents.map(res => (
                            <li key={res.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-stone-100">
                               <div>
                                  <p className="font-bold text-[#2D332D] text-sm">{res.fullName}</p>
                                  <p className="text-[11px] text-stone-500 mt-0.5">{res.department} · {res.position}</p>
                               </div>
                               {/* Only show if permitted, but keeping it visual for the rack module */}
                               <button 
                                 className="text-stone-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 shrink-0"
                                 title="Odadan Çıkış Yap"
                                 onClick={() => alert(`Personel çıkışı 'Personel Yönetimi' modülünden yapılmalıdır.`)}
                               >
                                  <LogOut className="w-4 h-4" />
                               </button>
                            </li>
                         ))}
                       </ul>
                    ) : (
                       <p className="text-sm text-stone-500 italic p-4 bg-stone-50 rounded-xl text-center border border-dashed border-stone-200">Oda şu an boş</p>
                    )}
                 </div>

                 {/* Maintenance */}
                 {selectedRoomDetails.hasMaintenance && (
                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                       <h3 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Açık Arıza Kayıtları</h3>
                       <ul className="space-y-2">
                         {selectedRoomDetails.openMaintenance.map(mt => (
                            <li key={mt.id} className="text-xs text-red-700 bg-white/50 p-2 rounded">
                               {mt.description} <span className="font-medium">({mt.reporterName})</span>
                            </li>
                         ))}
                       </ul>
                    </div>
                 )}
              </div>

              <div className="p-6 border-t border-stone-100 bg-stone-50 shrink-0">
                 <button 
                    onClick={() => alert("Arıza Bildir özelliği bakım modülüne yönlendirebilir.")}
                    className="w-full py-2.5 bg-white border border-[#E8E6E1] rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 text-stone-700 hover:bg-stone-50 transition-colors"
                 >
                    <Wrench className="w-4 h-4 text-stone-400" /> Arıza Bildir
                 </button>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}
