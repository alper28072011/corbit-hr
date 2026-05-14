import { useState, useMemo, ReactNode, useRef } from "react";
import { Users, UserPlus, Filter, DoorOpen, DoorClosed, LogOut, ShieldAlert, MoreVertical, Edit2, Trash2, FileText, CheckCircle, BedDouble, Replace } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";

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
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
          <div 
            className="fixed w-56 rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] bg-white border border-stone-100 z-[70] py-1 overflow-hidden" 
            style={{ top: position.top, right: position.right }}
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};

export default function StaffManagement() {
  const { hotels, facilities, rooms, staff, accommodations, addStaff, placeStaff, checkoutStaff, undoCheckoutStaff, deleteStaff, currentUser, roles } = useStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'placed' | 'left'>('pending');

  // Form states
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const defaultHotelId = currentUser?.role === 'hotel_hr_manager' 
    ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
    : '';

  const [newStaff, setNewStaff] = useState({
    fullName: '', tcNo: '', phone: '', department: '', position: '', hotelId: defaultHotelId, gender: 'male' as const
  });

  // Placement modal state
  const [selectedStaffIdToPlace, setSelectedStaffIdToPlace] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Filters state for "placed" tab
  const [filterHotel, setFilterHotel] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  // Column search states
  const [searchName, setSearchName] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [searchRoom, setSearchRoom] = useState('');
  const [searchCheckInDate, setSearchCheckInDate] = useState('');

  if (!hasPermission(currentUser?.role, PERMISSION_KEYS.view_staff_management, roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const canAddStaff = hasPermission(currentUser?.role, PERMISSION_KEYS.add_staff_request, roles);
  const canPlaceStaff = hasPermission(currentUser?.role, PERMISSION_KEYS.place_staff, roles);
  const canCheckoutStaff = hasPermission(currentUser?.role, PERMISSION_KEYS.checkout_staff, roles);
  const canEditStaff = hasPermission(currentUser?.role, PERMISSION_KEYS.edit_staff, roles);
  const canDeleteStaff = hasPermission(currentUser?.role, PERMISSION_KEYS.delete_staff, roles);
  const canChangeRoom = hasPermission(currentUser?.role, PERMISSION_KEYS.change_room, roles);
  const canViewDoc = hasPermission(currentUser?.role, PERMISSION_KEYS.view_document, roles);

  // Derived filtered data based on role
  // hotel_hr_manager sees only staff from their hotel
  // facility_manager nominally places staff, so they need to see pending staff. Placed staff should be filtered by their facility.
  
  const pendingStaffData = useMemo(() => {
    let base = staff.filter(s => s.status === 'pending_placement');
    return base
      .map(s => {
        const h = hotels.find(x => x.id === s.hotelId);
        return { staff: s, hotel: h };
      })
      .filter(item => {
        if (!item.staff) return false;
        
        // Role based filtering
        if (currentUser?.role === 'hotel_hr_manager') {
          const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
          if (item.hotel && !hotelIds.includes(item.hotel.id)) return false;
        }

        // UI filtering
        if (filterHotel && item.hotel?.id !== filterHotel) return false;
        if (filterGender && item.staff.gender !== filterGender) return false;
        if (filterDepartment && item.staff.department !== filterDepartment) return false;

        // Search filtering
        if (searchName && !item.staff.fullName.toLowerCase().includes(searchName.toLowerCase())) return false;
        if (filterFacility) return false; // Pending staff have no facility 
        if (searchRoom) return false; // Pending staff have no room
        if (searchCheckInDate) return false; // Pending staff have no check-in date

        return true;
      });
  }, [staff, hotels, filterHotel, filterGender, filterDepartment, searchName, filterFacility, searchRoom, searchCheckInDate, currentUser]);
  
  const placedStaffData = useMemo(() => {
    return accommodations
      .filter(a => a.status === 'active')
      .map(acc => {
        const s = staff.find(x => x.id === acc.staffId);
        const f = facilities.find(x => x.id === acc.facilityId);
        const r = rooms.find(x => x.id === acc.roomId);
        const h = hotels.find(x => x.id === s?.hotelId);
        return { acc, staff: s, facility: f, room: r, hotel: h };
      })
      .filter(item => {
        if (!item.staff) return false;
        
        // Role based filtering
        if (currentUser?.role === 'hotel_hr_manager') {
          const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
          if (item.hotel && !hotelIds.includes(item.hotel.id)) return false;
        }
        if (currentUser?.role === 'facility_manager') {
          const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
          if (item.facility && !facIds.includes(item.facility.id)) return false;
        }

        // UI filtering
        if (filterHotel && item.hotel?.id !== filterHotel) return false;
        if (filterGender && item.staff.gender !== filterGender) return false;
        if (filterDepartment && item.staff.department !== filterDepartment) return false;

        // Search filtering
        if (searchName && !item.staff.fullName.toLowerCase().includes(searchName.toLowerCase())) return false;
        if (filterFacility && item.facility?.id !== filterFacility) return false;
        if (searchRoom && !(item.room?.roomNumber || '').toLowerCase().includes(searchRoom.toLowerCase())) return false;
        if (searchCheckInDate && item.acc.checkInDate !== searchCheckInDate) return false;

        return true;
      })
      .sort((a, b) => {
        const facA = a.facility?.name || '';
        const facB = b.facility?.name || '';
        if (facA !== facB) return facA.localeCompare(facB);
        
        const roomA = a.room?.roomNumber || '';
        const roomB = b.room?.roomNumber || '';
        return roomA.localeCompare(roomB, undefined, { numeric: true });
      });
  }, [accommodations, staff, facilities, rooms, hotels, filterHotel, filterGender, filterDepartment, searchName, filterFacility, searchRoom, searchCheckInDate, currentUser]);

  const leftStaffData = useMemo(() => {
    return accommodations
      .filter(a => a.status === 'checked_out')
      .map(acc => {
        const s = staff.find(x => x.id === acc.staffId);
        const f = facilities.find(x => x.id === acc.facilityId);
        const r = rooms.find(x => x.id === acc.roomId);
        const h = hotels.find(x => x.id === s?.hotelId);
        return { acc, staff: s, facility: f, room: r, hotel: h };
      })
      .filter(item => {
        if (!item.staff) return false;
        
        // Role based filtering
        if (currentUser?.role === 'hotel_hr_manager') {
          const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
          if (item.hotel && !hotelIds.includes(item.hotel.id)) return false;
        }
        if (currentUser?.role === 'facility_manager') {
          const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
          if (item.facility && !facIds.includes(item.facility.id)) return false;
        }

        // UI filtering
        if (filterHotel && item.hotel?.id !== filterHotel) return false;
        if (filterGender && item.staff.gender !== filterGender) return false;
        if (filterDepartment && item.staff.department !== filterDepartment) return false;

        // Search filtering
        if (searchName && !item.staff.fullName.toLowerCase().includes(searchName.toLowerCase())) return false;
        if (filterFacility && item.facility?.id !== filterFacility) return false;
        if (searchRoom && !(item.room?.roomNumber || '').toLowerCase().includes(searchRoom.toLowerCase())) return false;
        if (searchCheckInDate && item.acc.checkInDate !== searchCheckInDate) return false;

        return true;
      })
      .sort((a, b) => {
        const facA = a.facility?.name || '';
        const facB = b.facility?.name || '';
        if (facA !== facB) return facA.localeCompare(facB);
        
        const roomA = a.room?.roomNumber || '';
        const roomB = b.room?.roomNumber || '';
        return roomA.localeCompare(roomB, undefined, { numeric: true });
      });
  }, [accommodations, staff, facilities, rooms, hotels, filterHotel, filterGender, filterDepartment, searchName, filterFacility, searchRoom, searchCheckInDate, currentUser]);

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)));

  const handleAddStaff = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.hotelId || !canAddStaff) return;
    addStaff({ ...newStaff, status: 'pending_placement' });
    setShowAddStaffForm(false);
    
    // reset form
    const defaultHotelId = currentUser?.role === 'hotel_hr_manager' 
      ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
      : '';
    setNewStaff({ fullName: '', tcNo: '', phone: '', department: '', position: '', hotelId: defaultHotelId, gender: 'male' });
  };

  const handlePlaceStaff = () => {
    if (!selectedStaffIdToPlace || !selectedFacilityId || !selectedRoomId) return;
    placeStaff(selectedStaffIdToPlace, selectedFacilityId, selectedRoomId);
    setSelectedStaffIdToPlace(null);
    setSelectedFacilityId('');
    setSelectedRoomId('');
  };

  const staffToPlace = staff.find(s => s.id === selectedStaffIdToPlace);
  
  // Available rooms calculation for placement
  const availableRooms = useMemo(() => {
    if (!staffToPlace || !selectedFacilityId) return [];
    
    return rooms.filter(r => {
      // Must belong to selected facility
      if (r.facilityId !== selectedFacilityId) return false;
      if (r.status !== 'active') return false;
      
      // Gender must match or be mixed (if we enforce strict rules, we can adjust)
      if (r.genderType !== 'mixed' && r.genderType !== staffToPlace.gender) return false;
      
      // Calculate current occupancy
      const occupancy = accommodations.filter(a => a.roomId === r.id && a.status === 'active').length;
      return occupancy < r.bedCount;
    });
  }, [rooms, staffToPlace, selectedFacilityId, accommodations]);

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Personel Yönetimi"
        description="Personel listesi, giriş-çıkış işlemleri ve oda yerleşimleri (allocation)."
        actions={
          canAddStaff && (
            <button 
              onClick={() => setShowAddStaffForm(true)}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Yeni Personel Kaydı
            </button>
          )
        }
      />

      {showAddStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Yeni Personel Ekle (İK Talebi)</h3>
            <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad</label>
                <input required type="text" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport</label>
                <input required type="text" value={newStaff.tcNo} onChange={e => setNewStaff({...newStaff, tcNo: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Telefon</label>
                <input type="text" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Çalıştığı Otel</label>
                <select 
                  required 
                  value={newStaff.hotelId} 
                  onChange={e => setNewStaff({...newStaff, hotelId: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg disabled:opacity-50"
                  disabled={currentUser?.role === 'hotel_hr_manager'}
                >
                  <option value="">Seçiniz...</option>
                  {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Departman</label>
                <input type="text" value={newStaff.department} onChange={e => setNewStaff({...newStaff, department: e.target.value})} placeholder="Örn: Mutfak" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                <input type="text" value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} placeholder="Örn: Aşçı" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cinsiyet</label>
                <select value={newStaff.gender} onChange={e => setNewStaff({...newStaff, gender: e.target.value as 'male'|'female'})} className="w-full px-3 py-2 border rounded-lg">
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
              
              <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddStaffForm(false)} className="px-5 py-2 border text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" className="px-5 py-2 bg-[#2D332D] text-white rounded-xl hover:bg-[#1A1C18] font-semibold text-sm">Kaydet (Havuza Ekle)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStaffIdToPlace && staffToPlace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Oda Yerleşimi (Check-in)</h3>
            <p className="text-stone-500 text-sm mb-6">Personel: <strong className="text-[#2D332D]">{staffToPlace.fullName}</strong> ({staffToPlace.gender === 'male' ? 'Erkek' : 'Kadın'})</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Lojman Seçimi</label>
                <select value={selectedFacilityId} onChange={(e) => { setSelectedFacilityId(e.target.value); setSelectedRoomId(''); }} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                  <option value="">Lojman Binası Seçin...</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name} (Kapasite: {f.capacity})</option>
                  ))}
                </select>
              </div>

              {selectedFacilityId && (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Uygun Oda Seçimi</label>
                  <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                    <option value="">Oda Seçin...</option>
                    {availableRooms.length === 0 && <option disabled>Uygun boş oda bulunamadı.</option>}
                    {availableRooms.map(r => {
                      const occ = accommodations.filter(a => a.roomId === r.id && a.status === 'active').length;
                      return (
                        <option key={r.id} value={r.id}>
                          Oda {r.roomNumber} ({occ}/{r.bedCount} Dolu) - {r.genderType === 'male' ? 'Erkek' : r.genderType === 'female' ? 'Kadın' : 'Karma'}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setSelectedStaffIdToPlace(null)} className="px-5 py-2 border text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
              <button 
                onClick={handlePlaceStaff} 
                disabled={!selectedFacilityId || !selectedRoomId}
                className="px-5 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Personeli Yerleştir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E8E6E1]">
        <div className="flex gap-4 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('pending')}
            className={cn("pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", activeTab === 'pending' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600")}
          >
            Yerleşim Bekleyenler
          </button>
          <button 
            onClick={() => setActiveTab('placed')}
            className={cn("pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", activeTab === 'placed' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600")}
          >
            Konaklayanlar
          </button>
          <button 
            onClick={() => setActiveTab('left')}
            className={cn("pb-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap", activeTab === 'left' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600")}
          >
            Ayrılanlar
          </button>
        </div>
        <div className="text-sm font-medium text-stone-500 pb-3 whitespace-nowrap pr-2">
          Toplam: <span className="font-bold text-stone-700">{activeTab === 'pending' ? pendingStaffData.length : activeTab === 'placed' ? placedStaffData.length : leftStaffData.length}</span>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card-standard p-6 flex flex-col flex-1 min-h-[400px]">
        {activeTab === 'pending' && (
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="overflow-x-auto rounded-xl border border-[#E8E6E1]">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-stone-400 uppercase tracking-widest border-b border-stone-100 bg-[#FDFCFB]">
                    <th className="py-4 px-6 font-semibold align-top w-48">
                      <div className="flex flex-col gap-2">
                        <span>Lojman</span>
                        <select
                           value={filterFacility}
                           onChange={e => setFilterFacility(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                           disabled
                        >
                           <option value="">Seçilemez</option>
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-28">
                      <div className="flex flex-col gap-2">
                        <span>Oda</span>
                        <input
                          type="text"
                          placeholder="Oda No"
                          value={searchRoom}
                          onChange={e => setSearchRoom(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                          disabled
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Personel</span>
                        <input
                          type="text"
                          placeholder="İsim Ara..."
                          value={searchName}
                          onChange={e => setSearchName(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Cinsiyet</span>
                        <select
                           value={filterGender}
                           onChange={e => setFilterGender(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           <option value="male">Erkek</option>
                           <option value="female">Kadın</option>
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Otel</span>
                        <select
                           value={filterHotel}
                           onChange={e => setFilterHotel(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Departman</span>
                        <select
                           value={filterDepartment}
                           onChange={e => setFilterDepartment(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-36">
                      <div className="flex flex-col gap-2">
                        <span>Kayıt Tarihi</span>
                        <input
                          type="date"
                          value={searchCheckInDate}
                          onChange={e => setSearchCheckInDate(e.target.value)}
                          className="px-2 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                          disabled
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top text-right">
                      <div className="flex flex-col gap-2 h-full justify-start pt-1">
                        <span>İşlemler</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#1A1C18] divide-y divide-[#E8E6E1]">
                  {pendingStaffData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-500">Yerleşim bekleyen personel bulunamadı.</td>
                    </tr>
                  ) : (
                    pendingStaffData.map(({ staff: s, hotel: h }) => (
                      <tr key={s.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-stone-400">Bekliyor</p>
                        </td>
                        <td className="py-4 px-6 font-mono font-medium text-stone-400">
                          -
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-[#2D332D]">{s?.fullName}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">{s?.tcNo}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${s?.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                            {s?.gender === 'female' ? 'Kadın' : 'Erkek'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-stone-600">{h?.name}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-stone-600">{s?.department}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{s?.position}</p>
                        </td>
                        <td className="py-4 px-6 text-stone-500">-</td>
                        <td className="py-4 px-6 text-right">
                          <ActionMenu>
                            {canPlaceStaff && (
                              <button 
                                onClick={() => setSelectedStaffIdToPlace(s.id)}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4 text-[#7C8363]" /> Yerleştir
                              </button>
                            )}
                            {canEditStaff && (
                              <button 
                                onClick={() => alert("Personel düzenleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" /> Düzenle
                              </button>
                            )}
                            {canViewDoc && (
                              <button 
                                onClick={() => alert("Belge görüntüleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" /> Belge Görüntüle
                              </button>
                            )}
                            {canDeleteStaff && (
                              <button 
                                onClick={() => { if(confirm(`${s?.fullName} isimli personelin kaydını tamamen silmek istediğinize emin misiniz?`)) deleteStaff(s.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100"
                              >
                                <Trash2 className="w-4 h-4" /> Kaydı Sil
                              </button>
                            )}
                          </ActionMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'placed' && (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-[#E8E6E1]">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-stone-400 uppercase tracking-widest border-b border-stone-100 bg-[#FDFCFB]">
                    <th className="py-4 px-6 font-semibold align-top w-48">
                      <div className="flex flex-col gap-2">
                        <span>Lojman</span>
                        <select
                           value={filterFacility}
                           onChange={e => setFilterFacility(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-28">
                      <div className="flex flex-col gap-2">
                        <span>Oda</span>
                        <input
                          type="text"
                          placeholder="Oda No"
                          value={searchRoom}
                          onChange={e => setSearchRoom(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Personel</span>
                        <input
                          type="text"
                          placeholder="İsim Ara..."
                          value={searchName}
                          onChange={e => setSearchName(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Cinsiyet</span>
                        <select
                           value={filterGender}
                           onChange={e => setFilterGender(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           <option value="male">Erkek</option>
                           <option value="female">Kadın</option>
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Otel</span>
                        <select
                           value={filterHotel}
                           onChange={e => setFilterHotel(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Departman</span>
                        <select
                           value={filterDepartment}
                           onChange={e => setFilterDepartment(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-36">
                      <div className="flex flex-col gap-2">
                        <span>Giriş Tarihi</span>
                        <input
                          type="date"
                          value={searchCheckInDate}
                          onChange={e => setSearchCheckInDate(e.target.value)}
                          className="px-2 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top text-right">
                      <div className="flex flex-col gap-2 h-full justify-start pt-1">
                        <span>İşlemler</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#1A1C18] divide-y divide-[#E8E6E1]">
                  {placedStaffData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500">Kayıtlı yerleşim bulunamadı. Filtreleri temizlemeyi deneyin.</td>
                    </tr>
                  ) : (
                    placedStaffData.map(({ acc, staff: s, facility: f, room: r, hotel: h }) => (
                      <tr key={acc.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-[#7C8363]">{f?.name || 'Bilinmiyor'}</p>
                        </td>
                        <td className="py-4 px-6 font-mono font-medium text-stone-600">
                          {r?.roomNumber || 'Bilinmiyor'}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-[#2D332D]">{s?.fullName}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">{s?.tcNo}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${s?.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                            {s?.gender === 'female' ? 'Kadın' : 'Erkek'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-stone-600">{h?.name}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-stone-600">{s?.department}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{s?.position}</p>
                        </td>
                        <td className="py-4 px-6 text-stone-500">{acc.checkInDate ? new Date(acc.checkInDate).toLocaleDateString('tr-TR') : '-'}</td>
                        <td className="py-4 px-6 text-right">
                          <ActionMenu>
                            {canCheckoutStaff && (
                              <button 
                                onClick={() => {
                                  if(confirm(`${s?.fullName} isimli personelin lojmandan çıkışını yapmak istediğinize emin misiniz?`)) {
                                    checkoutStaff(acc.id, new Date().toISOString().split('T')[0]);
                                  }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <LogOut className="w-4 h-4" /> Çıkış Yap
                              </button>
                            )}
                            {canChangeRoom && (
                              <button 
                                onClick={() => alert("Oda değiştirme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Replace className="w-4 h-4" /> Oda Değiştir
                              </button>
                            )}
                            {canEditStaff && (
                              <button 
                                onClick={() => alert("Personel düzenleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" /> Düzenle
                              </button>
                            )}
                            {canViewDoc && (
                              <button 
                                onClick={() => alert("Belge görüntüleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" /> Belge Görüntüle
                              </button>
                            )}
                            {canDeleteStaff && (
                              <button 
                                onClick={() => { if(confirm(`${s?.fullName} isimli personelin kaydını tamamen silmek istediğinize emin misiniz?`)) deleteStaff(s.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100"
                              >
                                <Trash2 className="w-4 h-4" /> Kaydı Sil
                              </button>
                            )}
                          </ActionMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'left' && (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-xl border border-[#E8E6E1]">
              <table className="min-w-full text-left">
                <thead>
                   <tr className="text-xs text-stone-400 uppercase tracking-widest border-b border-stone-100 bg-[#FDFCFB]">
                    <th className="py-4 px-6 font-semibold align-top w-48">
                      <div className="flex flex-col gap-2">
                        <span>Lojman</span>
                        <select
                           value={filterFacility}
                           onChange={e => setFilterFacility(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-28">
                      <div className="flex flex-col gap-2">
                        <span>Oda</span>
                        <input
                          type="text"
                          placeholder="Oda No"
                          value={searchRoom}
                          onChange={e => setSearchRoom(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Personel</span>
                        <input
                          type="text"
                          placeholder="İsim Ara..."
                          value={searchName}
                          onChange={e => setSearchName(e.target.value)}
                          className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] placeholder-stone-400 w-full"
                        />
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Cinsiyet</span>
                        <select
                           value={filterGender}
                           onChange={e => setFilterGender(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           <option value="male">Erkek</option>
                           <option value="female">Kadın</option>
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Otel</span>
                        <select
                           value={filterHotel}
                           onChange={e => setFilterHotel(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top">
                      <div className="flex flex-col gap-2">
                        <span>Departman</span>
                        <select
                           value={filterDepartment}
                           onChange={e => setFilterDepartment(e.target.value)}
                           className="px-3 py-1.5 border border-stone-200 rounded-md text-xs font-medium normal-case tracking-normal text-stone-700 bg-white focus:outline-none focus:border-[#7C8363] focus:ring-1 focus:ring-[#7C8363] w-full"
                        >
                           <option value="">Tümü</option>
                           {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top w-36">
                      <div className="flex flex-col gap-2">
                        <span>Giriş / Çıkış Tarihleri</span>
                      </div>
                    </th>
                    <th className="py-4 px-6 font-semibold align-top text-right">
                      <div className="flex flex-col gap-2 h-full justify-start pt-1">
                        <span>İşlemler</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#1A1C18] divide-y divide-[#E8E6E1]">
                  {leftStaffData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-500">Ayrılan personel kaydı bulunamadı.</td>
                    </tr>
                  ) : (
                    leftStaffData.map(({ acc, staff: s, facility: f, room: r, hotel: h }) => (
                      <tr key={acc.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-semibold text-[#7C8363]">{f?.name || 'Bilinmiyor'}</p>
                        </td>
                        <td className="py-4 px-6 font-mono font-medium text-stone-600">
                          {r?.roomNumber || 'Bilinmiyor'}
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-[#2D332D]">{s?.fullName}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">{s?.tcNo}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${s?.gender === 'female' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                            {s?.gender === 'female' ? 'Kadın' : 'Erkek'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-stone-600">{h?.name}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-stone-600">{s?.department}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{s?.position}</p>
                        </td>
                        <td className="py-4 px-6">
                           <p className="text-stone-500">G: {acc.checkInDate ? new Date(acc.checkInDate).toLocaleDateString('tr-TR') : '-'}</p>
                           <p className="text-red-500 font-medium">Ç: {acc.checkOutDate ? new Date(acc.checkOutDate).toLocaleDateString('tr-TR') : '-'}</p>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <ActionMenu>
                            {canPlaceStaff && (
                              <button 
                                onClick={() => {
                                  if(confirm(`${s?.fullName} isimli personelin lojmana geri dönüşünü (C/OUT İptali) onaylıyor musunuz?`)) {
                                    undoCheckoutStaff(acc.id);
                                  }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" /> Geri Al
                              </button>
                            )}
                            {canEditStaff && (
                              <button 
                                onClick={() => alert("Personel düzenleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" /> Düzenle
                              </button>
                            )}
                            {canViewDoc && (
                              <button 
                                onClick={() => alert("Belge görüntüleme ekranı geliştirme aşamasındadır.")}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <FileText className="w-4 h-4" /> Belge Görüntüle
                              </button>
                            )}
                            {canDeleteStaff && (
                              <button 
                                onClick={() => { if(confirm(`${s?.fullName} isimli personelin kaydını tamamen silmek istediğinize emin misiniz?`)) deleteStaff(s.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100"
                              >
                                <Trash2 className="w-4 h-4" /> Kaydı Sil
                              </button>
                            )}
                          </ActionMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
