import React, { useState, useMemo, useEffect, useRef, ReactNode } from 'react';
import { useStore } from '../store/useStore';
import { PageHeader } from '../components/layout/PageHeader';
import { usePageRefresh } from '../hooks/usePageRefresh';
import { cn, naturalSort } from '../lib/utils';
import { 
  Search, X, LayoutGrid, LayoutList, Grip, Users, 
  BedSingle, AlertTriangle, LogOut, CheckCircle, Wrench, ShieldAlert,
  MoreVertical, FileText, Phone, Edit2, Trash2, Replace
} from 'lucide-react';
import { canViewPage, can, PAGE_KEYS } from '../lib/permissions';
import { motion, AnimatePresence } from 'motion/react';
import { Staff } from '../types';
import RoomChangeWizard from '../components/staff/RoomChangeWizard';

const ActionMenu = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8, // slight offset
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block text-left">
      <button 
        ref={buttonRef}
        onClick={handleToggle} 
        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed w-56 rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] bg-white border border-stone-100 z-[70] py-1 overflow-hidden" 
              style={{ top: position.top, right: position.right }}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function RackManagement() {
  const { facilities, rooms, hotels, staff, accommodations, maintenanceTickets, currentUser, roles } = useStore();
  const sensitiveRequests = useStore(state => state.sensitiveDataAccessRequests || []);

  const userSensitiveRequest = sensitiveRequests.find(r => r.userId === currentUser?.id);
  const hasSensitiveDataAccess = currentUser?.email === 'alper28072011@gmail.com' || 
                                 currentUser?.isPrimarySensitiveDataOwner === true || 
                                 userSensitiveRequest?.status === 'Onaylandı';

  const maskPhone = (phoneStr?: string) => {
    if (!phoneStr) return '-';
    if (hasSensitiveDataAccess) return phoneStr;
    const clean = phoneStr.trim();
    if (clean.length < 4) return '***';
    return clean.slice(0, 3) + ' *** ** ' + clean.slice(-2);
  };

  // Read preferences
  const uiPrefs = useStore(state => state.uiPreferences);
  const setUiPreference = useStore(state => state.setUiPreference);
  const pageKey = PAGE_KEYS.rack;

  const rackFilters = uiPrefs.lastFilters[pageKey] || {};
  const searchQuery = rackFilters.search ?? '';
  const filterStatus = rackFilters.status ?? 'all';
  const filterFacility = rackFilters.facilityId ?? '';
  const filterGender = rackFilters.gender ?? '';
  const viewMode = (uiPrefs.viewModes[pageKey] as 'rack' | 'card' | 'list') || 'rack';

  const setSearchQuery = (val: string) => setUiPreference('lastFilters', pageKey, { ...rackFilters, search: val });
  const setFilterStatus = (val: string) => setUiPreference('lastFilters', pageKey, { ...rackFilters, status: val });
  const setFilterFacility = (val: string) => setUiPreference('lastFilters', pageKey, { ...rackFilters, facilityId: val });
  const setFilterGender = (val: string) => setUiPreference('lastFilters', pageKey, { ...rackFilters, gender: val });
  const setViewMode = (val: 'rack' | 'card' | 'list') => setUiPreference('viewModes', pageKey, val);

  const refreshAction = usePageRefresh();

  // Selected Room for Modal
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Staff Management states for Room Detail Panel actions
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: '', gender: 'male' as const, status: '', notes: '', specialNote: '', checkInDate: '', checkOutDate: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [changingRoomStaffInfo, setChangingRoomStaffInfo] = useState<{ staff: Staff, currentRoomId: string, currentFacilityId: string } | null>(null);
  const [notifyCheckoutModal, setNotifyCheckoutModal] = useState<{ open: boolean, staffId: string, staffName: string, date: string }>({ open: false, staffId: '', staffName: '', date: '' });

  const rp = useStore.getState().rolesPermissions;
  const canEditStaff = can(currentUser?.role, 'edit_staff', PAGE_KEYS.staff, rp);
  const canDeleteStaff = can(currentUser?.role, 'delete_staff', PAGE_KEYS.staff, rp);
  const canChangeRoom = can(currentUser?.role, 'change_room', PAGE_KEYS.staff, rp);
  const canCheckoutStaff = can(currentUser?.role, 'change_room', PAGE_KEYS.staff, rp);

  // Defer heavy rendering to prevent navigation freezing
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    // Allows the route transition to complete gracefully before doing heavy DOM work
    const t = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId) return;
    setIsSavingEdit(true);
    try {
      await useStore.getState().updateStaff(editingStaffId, editForm);
      setEditingStaffId(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleNotifyCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    useStore.getState().notifyCheckoutStaff(notifyCheckoutModal.staffId, notifyCheckoutModal.date);
    setNotifyCheckoutModal({ open: false, staffId: '', staffName: '', date: '' });
  };

  const availableHotels = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return hotels;
    if (currentUser.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      return hotels.filter(h => hotelIds.includes(h.id));
    }
    return hotels;
  }, [hotels, currentUser]);

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)))
    .filter((d): d is string => typeof d === 'string')
    .sort((a, b) => a.localeCompare(b, 'tr-TR'));

  const positions = Array.from(new Set(staff.map(s => s.position).filter(Boolean)))
    .filter((p): p is string => typeof p === 'string')
    .sort((a, b) => a.localeCompare(b, 'tr-TR'));

  const availableFacilities = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return facilities;
    
    let facs = facilities;
    if (currentUser.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      facs = facs.filter(f => facIds.includes(f.id));
    } else if (currentUser.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      facs = facs.filter(f => f.allowedHotelIds?.some(id => hotelIds.includes(id)) || (f as any).hotelId && hotelIds.includes((f as any).hotelId));
    }
    return facs;
  }, [facilities, currentUser]);

  const EnrichedRooms = useMemo(() => {
    // 1. Map active accommodations to roomId for fast lookup
    const accByRoom = new Map<string, typeof accommodations>();
    accommodations.forEach(a => {
      if (a.status !== 'active') return;
      if (!accByRoom.has(a.roomId)) accByRoom.set(a.roomId, []);
      accByRoom.get(a.roomId)!.push(a);
    });

    // 2. Map staff by id for fast lookup
    const staffById = new Map<string, typeof staff[0]>();
    staff.forEach(s => staffById.set(s.id, s));

    // 3. Map open maintenance tickets to roomId
    const maintByRoom = new Map<string, typeof maintenanceTickets>();
    maintenanceTickets.forEach(m => {
      if (m.status !== 'Açık' && m.status !== 'İşlemde') return;
      if (!maintByRoom.has(m.roomId)) maintByRoom.set(m.roomId, []);
      maintByRoom.get(m.roomId)!.push(m);
    });

    return rooms.map(room => {
      const activeAccs = accByRoom.get(room.id) || [];
      const currentResidents = activeAccs
        .map(a => staffById.get(a.staffId))
        .filter((s): s is typeof staff[0] => s !== undefined);
      
      const openMaintenance = maintByRoom.get(room.id) || [];
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
    const filtered = EnrichedRooms.filter(room => {
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
    });
    return naturalSort(filtered, (r: any) => r.roomNumber);
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

  if (!canViewPage(currentUser?.role, PAGE_KEYS.rack, useStore.getState().rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="shrink-0">
        <PageHeader
          title="Oda Doluluk (Rack)"
          description="Odaların anlık doluluk durumlarını, kapasitelerini ve arıza kayıtlarını yönetin."
          actions={[refreshAction]}
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
            {!isReady ? (
               <div className="flex flex-col items-center justify-center p-12 text-stone-400">
                  <div className="w-8 h-8 border-4 border-stone-200 border-t-amber-500 rounded-full animate-spin mb-4" />
                  <p className="font-medium animate-pulse">Rack görünümü yükleniyor...</p>
               </div>
            ) : availableFacilities.map(facility => {
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
      <AnimatePresence>
      {selectedRoomId && selectedRoomDetails && (
         <div className="fixed inset-0 z-50 flex items-center justify-end bg-stone-900/60 p-4 transition-all" onClick={() => setSelectedRoomId(null)}>
           <motion.div 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white h-[98vh] max-h-full w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
           >
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
                            <li key={res.id} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-stone-100">
                               <div className="flex items-start justify-between">
                                  <div>
                                     <div className="flex items-center gap-2">
                                       <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", res.gender === 'female' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>{res.gender === 'female' ? 'K' : 'E'}</span>
                                       <p className="font-bold text-[#2D332D] text-sm">{res.fullName}</p>
                                     </div>
                                     <p className="text-[11px] text-stone-500 mt-1.5">
                                        <span className="font-semibold text-stone-700">{hotels.find(h => h.id === res.hotelId)?.name || 'Otelsiz'}</span><br />
                                        {res.department} {res.department && res.position ? '·' : ''} {res.position}
                                     </p>
                                     <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
                                        <span title="TC / Passport"><FileText className="w-3 h-3 inline mr-1" />{res.tcNo || '-'}</span>
                                        <span title="Telefon"><Phone className="w-3 h-3 inline mr-1" />{maskPhone(res.phone)}</span>
                                     </div>
                                  </div>
                                  
                                  {(canEditStaff || canCheckoutStaff || canChangeRoom || canDeleteStaff) && (
                                     <div className="shrink-0 pl-2">
                                       <ActionMenu>
                                         {canEditStaff && (
                                             <button 
                                               onClick={() => {
                                                 setEditForm({ ...res });
                                                 setEditingStaffId(res.id);
                                               }}
                                               className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                             >
                                               <Edit2 className="w-4 h-4" /> Düzenle
                                             </button>
                                         )}
                                         {canChangeRoom && selectedRoomId && (
                                            <button 
                                              onClick={() => setChangingRoomStaffInfo({ staff: res, currentRoomId: selectedRoomId, currentFacilityId: selectedRoomDetails.facilityId })}
                                              className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                            >
                                              <Replace className="w-4 h-4" /> Oda Değiştir
                                            </button>
                                         )}
                                         {canCheckoutStaff && (
                                            <button 
                                              onClick={() => setNotifyCheckoutModal({ open: true, staffId: res.id, staffName: res.fullName, date: res.checkOutDate || new Date().toISOString().split('T')[0] })}
                                              className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                            >
                                              <LogOut className="w-4 h-4" /> Çıkış (Planla/Yap)
                                            </button>
                                         )}
                                         {canDeleteStaff && (
                                            <button 
                                              onClick={() => {
                                                if (confirm('Bu personeli silmek istediğinize emin misiniz?')) {
                                                   useStore.getState().deleteStaff(res.id);
                                                }
                                              }}
                                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 pt-1"
                                            >
                                              <Trash2 className="w-4 h-4" /> Kaydı Sil
                                            </button>
                                         )}
                                       </ActionMenu>
                                     </div>
                                  )}
                               </div>
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
           </motion.div>
         </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {/* Edit Staff Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
          >
            <h3 className="text-xl font-bold mb-6 text-[#2D332D]">Personel Düzenle</h3>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad *</label>
                <input required type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Doğum Tarihi</label>
                <input type="date" value={editForm.birthDate} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport</label>
                <input type="text" value={editForm.tcNo} onChange={e => setEditForm({...editForm, tcNo: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Telefon</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Çalıştığı Otel *</label>
                <select 
                  required 
                  value={editForm.hotelId} 
                  onChange={e => setEditForm({...editForm, hotelId: e.target.value})} 
                  className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] disabled:opacity-50"
                  disabled={availableHotels.length <= 1}
                >
                  <option value="">Seçiniz...</option>
                  {availableHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cinsiyet *</label>
                <select value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value as 'male'|'female'})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Departman</label>
                <input type="text" list="departments-list-edit" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                <datalist id="departments-list-edit">
                  {departments.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                <input type="text" list="positions-list-edit" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                <datalist id="positions-list-edit">
                  {positions.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Giriş Tarihi</label>
                <input type="date" value={editForm.checkInDate || ''} onChange={e => setEditForm({...editForm, checkInDate: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Çıkış Tarihi</label>
                <input type="date" value={editForm.checkOutDate || ''} onChange={e => setEditForm({...editForm, checkOutDate: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Notlar / Açıklama</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Personel ile ilgili notlar..." className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] min-h-[80px]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Sıra Dışı Yerleşim (İK Notu)</label>
                <textarea value={editForm.specialNote} onChange={e => setEditForm({...editForm, specialNote: e.target.value})} placeholder="Örn: Eşi Ayşe Yılmaz ile Aile odasında kalacak." className="w-full px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm focus:outline-none focus:border-red-400 min-h-[60px]" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingStaffId(null)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" disabled={isSavingEdit} className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2">
                  {isSavingEdit ? 'Kaydediliyor...' : <><Edit2 className="w-4 h-4"/> Kaydet</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Notify Checkout Modal */}
      <AnimatePresence>
      {notifyCheckoutModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-[#E8E6E1]">
              <h2 className="text-xl font-bold text-[#2D332D]">Çıkış Planlama</h2>
              <button 
                onClick={() => setNotifyCheckoutModal({ open: false, staffId: '', staffName: '', date: '' })}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={handleNotifyCheckoutSubmit} className="p-6">
               <p className="text-sm text-stone-600 mb-4">
                 <strong>{notifyCheckoutModal.staffName}</strong> adlı personel için otel tarafından belirlenen tahmini çıkış tarihi (Planlanan Çıkış):
               </p>
               <input 
                 type="date" 
                 required
                 value={notifyCheckoutModal.date} 
                 onChange={e => setNotifyCheckoutModal({...notifyCheckoutModal, date: e.target.value})} 
                 className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl focus:outline-none focus:border-red-500 mb-6" 
               />
               
               <div className="flex justify-between gap-3">
                 <button 
                   type="button"
                   onClick={() => {
                     // Directly checkout now
                     const acc = accommodations.find(a => a.staffId === notifyCheckoutModal.staffId && a.status === 'active');
                     if (acc) {
                       useStore.getState().checkoutStaff(acc.id, new Date().toISOString().split('T')[0]);
                     }
                     setNotifyCheckoutModal({ open: false, staffId: '', staffName: '', date: '' });
                   }}
                   className="px-4 py-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-semibold text-sm flex-1"
                 >
                   Hemen Çıkış Yap
                 </button>
                 <button 
                   type="submit" 
                   className="px-4 py-2 bg-stone-800 text-white rounded-xl hover:bg-stone-900 font-semibold text-sm flex-1"
                 >
                   Planla / Kaydet
                 </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Room Change Wizard */}
      <AnimatePresence>
      {changingRoomStaffInfo && (
        <RoomChangeWizard 
          staff={changingRoomStaffInfo.staff}
          currentRoomId={changingRoomStaffInfo.currentRoomId}
          currentFacilityId={changingRoomStaffInfo.currentFacilityId}
          onClose={() => setChangingRoomStaffInfo(null)}
        />
      )}
      </AnimatePresence>
    </div>
  );
}
