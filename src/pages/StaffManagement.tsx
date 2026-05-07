import { useState, useMemo } from "react";
import { Users, UserPlus, Filter, DoorOpen, DoorClosed, LogOut, ShieldAlert } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSIONS, hasPermission } from "../lib/permissions";

export default function StaffManagement() {
  const { hotels, facilities, rooms, staff, accommodations, addStaff, placeStaff, checkoutStaff, currentUser } = useStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'placed'>('pending');

  // Form states
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [newStaff, setNewStaff] = useState({
    fullName: '', tcNo: '', phone: '', department: '', position: '', hotelId: currentUser?.role === 'hotel_hr_manager' ? (currentUser.assignedHotelId || '') : '', gender: 'male' as const
  });

  // Placement modal state
  const [selectedStaffIdToPlace, setSelectedStaffIdToPlace] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Filters state for "placed" tab
  const [filterHotel, setFilterHotel] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  if (!hasPermission(currentUser?.role, PERMISSIONS.view_staff_management)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const canAddStaff = hasPermission(currentUser?.role, PERMISSIONS.add_staff_request);
  const canPlaceStaff = hasPermission(currentUser?.role, PERMISSIONS.place_staff);

  // Derived filtered data based on role
  // hotel_hr_manager sees only staff from their hotel
  // facility_manager nominally places staff, so they need to see pending staff. Placed staff should be filtered by their facility.
  
  const pendingStaff = useMemo(() => {
    let base = staff.filter(s => s.status === 'pending_placement');
    if (currentUser?.role === 'hotel_hr_manager' && currentUser.assignedHotelId) {
      return base.filter(s => s.hotelId === currentUser.assignedHotelId);
    }
    return base;
  }, [staff, currentUser]);
  
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
        if (currentUser?.role === 'hotel_hr_manager' && item.hotel?.id !== currentUser.assignedHotelId) return false;
        if (currentUser?.role === 'facility_manager' && item.facility?.id !== currentUser.assignedFacilityId) return false;

        // UI filtering
        if (filterHotel && item.hotel?.id !== filterHotel) return false;
        if (filterGender && item.staff.gender !== filterGender) return false;
        if (filterDepartment && item.staff.department !== filterDepartment) return false;
        return true;
      });
  }, [accommodations, staff, facilities, rooms, hotels, filterHotel, filterGender, filterDepartment, currentUser]);

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)));

  const handleAddStaff = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.hotelId || !canAddStaff) return;
    addStaff({ ...newStaff, status: 'pending_placement' });
    setShowAddStaffForm(false);
    setNewStaff({ fullName: '', tcNo: '', phone: '', department: '', position: '', hotelId: currentUser?.role === 'hotel_hr_manager' ? (currentUser.assignedHotelId || '') : '', gender: 'male' });
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
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-[#E8E6E1] pb-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#2D332D]">Personel Yönetimi</h2>
          <p className="text-stone-500 mt-1">Personel listesi, giriş-çıkış işlemleri ve oda yerleşimleri (allocation).</p>
        </div>
        {canAddStaff && (
          <button 
            onClick={() => setShowAddStaffForm(true)}
            className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Yeni Personel Kaydı
          </button>
        )}
      </div>

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
      <div className="flex gap-4 border-b border-[#E8E6E1]">
        <button 
          onClick={() => setActiveTab('pending')}
          className={cn("pb-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'pending' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600")}
        >
          Yerleşim Bekleyenler ({pendingStaff.length})
        </button>
        <button 
          onClick={() => setActiveTab('placed')}
          className={cn("pb-3 text-sm font-bold border-b-2 transition-colors", activeTab === 'placed' ? "border-[#2D332D] text-[#2D332D]" : "border-transparent text-stone-400 hover:text-stone-600")}
        >
          Mevcut Konaklayanlar ({accommodations.filter(a => a.status === 'active').length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm min-h-[400px]">
        {activeTab === 'pending' && (
          <div>
            {pendingStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-stone-400">
                <DoorOpen className="w-12 h-12 mb-4 opacity-20" />
                <p>Şu anda yerleşim bekleyen personel bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingStaff.map(staff => (
                  <div key={staff.id} className="p-5 border border-[#E8E6E1] rounded-2xl bg-[#FDFCFB] flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-[#2D332D]">{staff.fullName}</h4>
                      <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-1 rounded-full uppercase">Bekliyor</span>
                    </div>
                    <p className="text-sm text-stone-500 mb-1">{staff.department} - {staff.position}</p>
                    <p className="text-xs text-stone-400 mb-4 font-semibold">Otel: <span className="font-normal text-stone-600">{hotels.find(h => h.id === staff.hotelId)?.name || 'Bilinmiyor'}</span></p>
                    <div className="mt-auto pt-4 border-t border-stone-100">
                      {canPlaceStaff && (
                        <button 
                          onClick={() => setSelectedStaffIdToPlace(staff.id)}
                          className="w-full py-2 bg-stone-900 text-white rounded-lg text-sm font-semibold hover:bg-stone-800 transition-colors"
                        >
                          Oda Seç & Yerleştir
                        </button>
                      )}
                      {!canPlaceStaff && (
                        <div className="w-full text-center py-2 text-stone-400 text-sm font-semibold">
                          Lojman Sorumlusu Bekleniyor
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'placed' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end bg-stone-50 p-4 rounded-xl border border-[#E8E6E1]">
              <div className="flex items-center gap-2 text-stone-500">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wider">Filtreler</span>
              </div>
              <select value={filterHotel} onChange={e => setFilterHotel(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#7C8363]">
                 <option value="">Tüm Oteller</option>
                 {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#7C8363]">
                 <option value="">Tüm Departmanlar</option>
                 {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
               <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-[#7C8363]">
                 <option value="">Tüm Cinsiyetler</option>
                 <option value="male">Erkek</option>
                 <option value="female">Kadın</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#E8E6E1]">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="text-xs text-stone-400 uppercase tracking-widest border-b border-stone-100 bg-[#FDFCFB]">
                    <th className="py-4 px-6 font-semibold">Personel</th>
                    <th className="py-4 px-6 font-semibold">Otel</th>
                    <th className="py-4 px-6 font-semibold">Lojman / Oda</th>
                    <th className="py-4 px-6 font-semibold">Giriş Tarihi</th>
                    <th className="py-4 px-6 font-semibold text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-[#1A1C18] divide-y divide-[#E8E6E1]">
                  {placedStaffData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-500">Kayıtlı yerleşim bulunamadı. Filtreleri temizlemeyi deneyin.</td>
                    </tr>
                  ) : (
                    placedStaffData.map(({ acc, staff: s, facility: f, room: r, hotel: h }) => (
                      <tr key={acc.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-[#2D332D]">{s?.fullName}</p>
                          <p className="text-[11px] text-stone-500 mt-0.5">{s?.department} / {s?.position}</p>
                        </td>
                        <td className="py-4 px-6 text-stone-600">{h?.name}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-[#7C8363]">{f?.name || 'Bilinmiyor'}</p>
                          <p className="text-xs font-mono text-stone-500 mt-0.5">Oda: {r?.roomNumber || 'Bilinmiyor'}</p>
                        </td>
                        <td className="py-4 px-6 text-stone-500">{new Date(acc.checkInDate).toLocaleDateString('tr-TR')}</td>
                        <td className="py-4 px-6 text-right">
                          {canPlaceStaff && (
                            <button 
                              onClick={() => {
                                if(confirm(`${s?.fullName} isimli personelin lojmandan çıkışını yapmak istediğinize emin misiniz?`)) {
                                  checkoutStaff(acc.id, new Date().toISOString().split('T')[0]);
                                }
                              }}
                              className="inline-flex bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors items-center gap-1.5 border border-red-100"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Çıkış Yap
                            </button>
                          )}
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
