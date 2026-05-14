import { useState, useEffect, useMemo } from "react";
import { BedDouble, Plus, Copy, Trash2, Edit2, Building, AlertCircle, ShieldAlert, Check, X, Search, Filter } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";

export default function RoomManagement() {
  const { hotels, facilities, rooms, addRoom, addRoomsBulk, updateRoom, deleteRoom, currentUser, roles } = useStore();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const canEdit = hasPermission(currentUser?.role, PERMISSION_KEYS.edit_room_management, roles);

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

  useEffect(() => {
    if (availableFacilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(availableFacilities[0].id);
    }
  }, [availableFacilities, selectedFacilityId]);

  // Single Room Form State
  const [newRoom, setNewRoom] = useState({
    roomNumber: '', block: '', floor: '', bedCount: 1, genderType: 'male' as const, notes: ''
  });

  // Bulk Room Form State
  const [bulkConfig, setBulkConfig] = useState({
    prefix: '', block: '', floor: '', startNo: 1, count: 10, bedCount: 2, genderType: 'male' as const, notes: ''
  });

  // Edit Room State
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomData, setEditRoomData] = useState<{ 
    roomNumber?: string, block?: string; floor?: string; bedCount?: number, genderType?: any, status?: any, notes?: string
  }>({});

  const facilityRooms = useMemo(() => {
    let filtered = rooms.filter(r => r.facilityId === selectedFacilityId);
    
    if (searchQuery) {
      filtered = filtered.filter(r => r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterBlock) {
      filtered = filtered.filter(r => r.block === filterBlock);
    }
    if (filterGender) {
      filtered = filtered.filter(r => r.genderType === filterGender);
    }
    if (filterStatus) {
      filtered = filtered.filter(r => r.status === filterStatus);
    }

    return filtered;
  }, [rooms, selectedFacilityId, searchQuery, filterBlock, filterGender, filterStatus]);

  const uniqueBlocks = useMemo(() => {
    const blocks = rooms.filter(r => r.facilityId === selectedFacilityId).map(r => r.block).filter(Boolean);
    return Array.from(new Set(blocks));
  }, [rooms, selectedFacilityId]);

  const handleStartEdit = (room: any) => {
    setEditingRoomId(room.id);
    setEditRoomData({
      roomNumber: room.roomNumber,
      block: room.block,
      floor: room.floor,
      bedCount: room.bedCount,
      genderType: room.genderType,
      status: room.status,
      notes: room.notes || ''
    });
  };

  const handleSaveEdit = () => {
    if (editingRoomId && editRoomData) {
      updateRoom(editingRoomId, editRoomData);
      setEditingRoomId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingRoomId(null);
  };

  if (!hasPermission(currentUser?.role, PERMISSION_KEYS.view_room_management, roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const handleAddSingleRoom = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !newRoom.roomNumber || !canEdit) return;
    addRoom({
      facilityId: selectedFacilityId,
      roomNumber: newRoom.roomNumber,
      block: newRoom.block,
      floor: newRoom.floor,
      bedCount: Number(newRoom.bedCount),
      genderType: newRoom.genderType,
      status: 'active',
      notes: newRoom.notes
    });
    setNewRoom({ roomNumber: '', block: '', floor: '', bedCount: 1, genderType: 'male', notes: '' });
    setShowAddForm(false);
  };

  const handleAddBulkRooms = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || bulkConfig.count <= 0 || !canEdit) return;

    const newRooms = [];
    for (let i = 0; i < bulkConfig.count; i++) {
      newRooms.push({
        facilityId: selectedFacilityId,
        roomNumber: `${bulkConfig.prefix}${bulkConfig.startNo + i}`,
        block: bulkConfig.block,
        floor: bulkConfig.floor,
        bedCount: Number(bulkConfig.bedCount),
        genderType: bulkConfig.genderType,
        status: 'active' as const,
        notes: bulkConfig.notes
      });
    }
    addRoomsBulk(newRooms);
    setBulkConfig({ ...bulkConfig, startNo: bulkConfig.startNo + bulkConfig.count });
    setShowAddForm(false);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 gap-6 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Oda Yönetimi"
          description="Oda tipleri, yatak kapasiteleri ve oda detaylarını buradan yönetin."
          actions={
            canEdit && (
              <button 
                onClick={() => setShowAddForm(true)}
                disabled={!selectedFacilityId}
                className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Yeni Oda Ekle
              </button>
            )
          }
        />
      </div>

      {/* Toolbar */}
      <div className="card-standard p-4 flex flex-col md:flex-row justify-between gap-4 bg-[#FDFCFB] shrink-0 md:items-center">
        {selectedFacilityId ? (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Oda no veya açıklama ile ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] shadow-sm transition-all"
            />
          </div>
        ) : <div className="flex-1 max-w-md md:block hidden"></div>}

        <div className="flex items-center gap-3 shrink-0 overflow-x-auto pb-2 md:pb-0 hide-scrollbar w-full md:w-auto overflow-y-hidden md:justify-end">
          {selectedFacilityId && (
            <>
              <select 
                value={filterBlock} 
                onChange={(e) => setFilterBlock(e.target.value)}
                className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[120px]"
              >
                <option value="">Tüm Bloklar</option>
                {uniqueBlocks.map((b, i) => <option key={i} value={b as string}>{b}</option>)}
              </select>
              <select 
                value={filterGender} 
                onChange={(e) => setFilterGender(e.target.value)}
                className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[130px]"
              >
                <option value="">Tüm Cinsiyetler</option>
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="mixed">Karma</option>
              </select>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[130px]"
              >
                <option value="">Tüm Durumlar</option>
                <option value="active">Aktif</option>
                <option value="maintenance">Bakımda</option>
                <option value="inactive">Pasif</option>
              </select>
              <div className="h-8 w-px bg-[#E8E6E1] hidden md:block mx-1" />
            </>
          )}

          <select 
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="flex-none max-w-sm px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-[#7C8363] text-white shadow-sm font-semibold min-w-[200px]"
          >
            <option value="" disabled className="bg-white text-stone-700">Lojman Seçiniz...</option>
            {availableFacilities.map(f => {
              return <option key={f.id} value={f.id} className="bg-white text-stone-700">{f.name}</option>;
            })}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 shrink-0 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-[#E8E6E1] shrink-0">
              <h3 className="text-xl font-bold text-[#2D332D]">Yeni Oda Kaydı</h3>
              <button onClick={() => setShowAddForm(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 shrink-0 bg-stone-50 border-b border-[#E8E6E1]">
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#E8E6E1] w-fit mx-auto">
                <button 
                  onClick={() => setActiveTab('single')}
                  className={cn("px-6 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'single' ? "bg-[#7C8363] shadow-sm text-white" : "text-stone-500 hover:text-[#2D332D]")}
                >Tekli Kayıt</button>
                <button 
                  onClick={() => setActiveTab('bulk')}
                  className={cn("px-6 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'bulk' ? "bg-[#7C8363] shadow-sm text-white" : "text-stone-500 hover:text-[#2D332D]")}
                >Toplu Kayıt</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === 'single' ? (
                <form id="singleRoomForm" onSubmit={handleAddSingleRoom} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Oda No *</label>
                      <input required type="text" value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} placeholder="Örn: 101" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Blok</label>
                      <input type="text" value={newRoom.block} onChange={e => setNewRoom({...newRoom, block: e.target.value})} placeholder="Örn: A Blok" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Kat</label>
                      <input type="text" value={newRoom.floor} onChange={e => setNewRoom({...newRoom, floor: e.target.value})} placeholder="Örn: 1. Kat" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yatak Sayısı *</label>
                      <input required type="number" min="1" value={newRoom.bedCount} onChange={e => setNewRoom({...newRoom, bedCount: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cinsiyet *</label>
                      <select value={newRoom.genderType} onChange={e => setNewRoom({...newRoom, genderType: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                        <option value="mixed">Karma</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Açıklama</label>
                      <input type="text" value={newRoom.notes} onChange={e => setNewRoom({...newRoom, notes: e.target.value})} placeholder="Oda ile ilgili özel notlar..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </form>
              ) : (
                <form id="bulkRoomForm" onSubmit={handleAddBulkRooms} className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ön Ek</label>
                      <input type="text" value={bulkConfig.prefix} onChange={e => setBulkConfig({...bulkConfig, prefix: e.target.value})} placeholder="Örn: A-" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Başlangıç No *</label>
                      <input required type="number" value={bulkConfig.startNo} onChange={e => setBulkConfig({...bulkConfig, startNo: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Adet *</label>
                      <input required type="number" min="1" value={bulkConfig.count} onChange={e => setBulkConfig({...bulkConfig, count: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Blok (Atanacaksa)</label>
                      <input type="text" value={bulkConfig.block} onChange={e => setBulkConfig({...bulkConfig, block: e.target.value})} placeholder="Örn: B Blok" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Kat (Atanacaksa)</label>
                      <input type="text" value={bulkConfig.floor} onChange={e => setBulkConfig({...bulkConfig, floor: e.target.value})} placeholder="Örn: 2. Kat" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yatak / Oda *</label>
                      <input required type="number" min="1" value={bulkConfig.bedCount} onChange={e => setBulkConfig({...bulkConfig, bedCount: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cinsiyet *</label>
                      <select value={bulkConfig.genderType} onChange={e => setBulkConfig({...bulkConfig, genderType: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                        <option value="mixed">Karma</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Açıklama</label>
                      <input type="text" value={bulkConfig.notes} onChange={e => setBulkConfig({...bulkConfig, notes: e.target.value})} placeholder="Her oda için geçerli olacak not..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </form>
              )}
            </div>
            <div className="p-6 border-t border-[#E8E6E1] shrink-0 flex justify-end gap-3 bg-stone-50">
              <button onClick={() => setShowAddForm(false)} className="px-6 py-2.5 rounded-xl font-semibold text-stone-600 hover:bg-stone-200 transition-colors">
                İptal
              </button>
              <button 
                type="submit" 
                form={activeTab === 'single' ? "singleRoomForm" : "bulkRoomForm"} 
                className="px-6 py-2.5 bg-[#7C8363] text-white rounded-xl font-semibold hover:bg-[#6A7152] transition-colors flex items-center gap-2"
              >
                {activeTab === 'single' ? <><Plus className="w-4 h-4"/> Ekle</> : <><Copy className="w-4 h-4"/> {bulkConfig.count} Oda Ekle</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Table Content */}
      <div className="card-standard flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
        {!selectedFacilityId ? (
           <div className="flex flex-col items-center justify-center flex-1 text-center text-stone-400 p-6">
             <Search className="w-12 h-12 mb-4 opacity-30" />
             <h3 className="text-xl font-bold text-[#2D332D] mb-2">Lojman Seçimi Bekleniyor</h3>
             <p className="text-sm">Odaları görüntülemek veya filtrelemek için üst bölümden bir lojman seçin.</p>
           </div>
        ) : (
            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-left relative">
                <thead className="bg-[#FDFCFB] sticky top-0 z-10 shadow-sm border-b border-[#E8E6E1]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Oda No</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Blok</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Kat</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Kapasite</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Cinsiyet</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Durum</th>
                    <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Açıklama</th>
                    {canEdit && <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">İşlemler</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E6E1] bg-white">
                  {facilityRooms.length === 0 ? (
                    <tr>
                      <td colSpan={canEdit ? 8 : 7} className="px-6 py-12 text-center text-stone-500">
                        Seçilen kriterlere uygun oda bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    facilityRooms.map(room => (
                      <tr key={room.id} className="hover:bg-stone-50 transition-colors">
                        {editingRoomId === room.id ? (
                          <>
                            <td className="px-6 py-3"><input type="text" value={editRoomData.roomNumber || ''} onChange={e => setEditRoomData({...editRoomData, roomNumber: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                            <td className="px-6 py-3"><input type="text" value={editRoomData.block || ''} onChange={e => setEditRoomData({...editRoomData, block: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                            <td className="px-6 py-3"><input type="text" value={editRoomData.floor || ''} onChange={e => setEditRoomData({...editRoomData, floor: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                            <td className="px-6 py-3"><input type="number" min="1" value={editRoomData.bedCount || 1} onChange={e => setEditRoomData({...editRoomData, bedCount: parseInt(e.target.value) || 1})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                            <td className="px-6 py-3">
                              <select value={editRoomData.genderType} onChange={e => setEditRoomData({...editRoomData, genderType: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
                                <option value="male">Erkek</option>
                                <option value="female">Kadın</option>
                                <option value="mixed">Karma</option>
                              </select>
                            </td>
                            <td className="px-6 py-3">
                              <select value={editRoomData.status} onChange={e => setEditRoomData({...editRoomData, status: e.target.value})} className="w-full px-2 py-1 text-sm border rounded">
                                <option value="active">Aktif</option>
                                <option value="maintenance">Bakım</option>
                                <option value="inactive">Pasif</option>
                              </select>
                            </td>
                            <td className="px-6 py-3"><input type="text" value={editRoomData.notes || ''} onChange={e => setEditRoomData({...editRoomData, notes: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                            <td className="px-6 py-3">
                              <div className="flex justify-end gap-2">
                                <button onClick={handleSaveEdit} className="p-1.5 bg-[#7C8363] text-white rounded hover:bg-[#6A7152]" title="Kaydet"><Check className="w-4 h-4" /></button>
                                <button onClick={handleCancelEdit} className="p-1.5 bg-stone-200 text-stone-700 rounded hover:bg-stone-300" title="İptal"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-stone-800">{room.roomNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{room.block || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">{room.floor || '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-stone-700">{room.bedCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold",
                                room.genderType === 'female' ? "bg-pink-100 text-pink-700" :
                                room.genderType === 'male' ? "bg-blue-100 text-blue-700" :
                                "bg-purple-100 text-purple-700"
                              )}>
                                {room.genderType === 'female' ? 'Kadın' : room.genderType === 'male' ? 'Erkek' : 'Karma'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                room.status === 'active' ? "bg-green-50 text-green-700 border-green-200" :
                                room.status === 'maintenance' ? "bg-orange-50 text-orange-700 border-orange-200" :
                                "bg-red-50 text-red-700 border-red-200"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", 
                                  room.status === 'active' ? "bg-green-500" : room.status === 'maintenance' ? "bg-orange-500" : "bg-red-500"
                                )} />
                                {room.status === 'active' ? 'Aktif' : room.status === 'maintenance' ? 'Bakımda' : 'Pasif'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-stone-600 truncate max-w-xs">{room.notes || '-'}</td>
                            {canEdit && (
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleStartEdit(room)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors" title="Düzenle">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteRoom(room.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        )}
      </div>
    </div>
  );
}
