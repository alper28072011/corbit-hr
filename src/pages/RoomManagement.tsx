import { useState, useEffect, useMemo } from "react";
import { BedDouble, Plus, Copy, Trash2, Edit2, Building, AlertCircle, ShieldAlert, Check, X } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";

export default function RoomManagement() {
  const { hotels, facilities, rooms, addRoom, addRoomsBulk, updateRoom, deleteRoom, currentUser, roles } = useStore();

  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');

  const canEdit = hasPermission(currentUser?.role, PERMISSION_KEYS.edit_room_management, roles);

  useEffect(() => {
    if (currentUser?.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      if (facIds.length > 0 && !selectedFacilityId) {
        const facility = facilities.find(f => f.id === facIds[0]);
        if (facility) {
          setSelectedHotelId(facility.hotelId);
          setSelectedFacilityId(facility.id);
        }
      }
    }
  }, [currentUser, facilities]);

  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Single Room State
  const [newRoom, setNewRoom] = useState({
    roomNumber: '', bedCount: 1, genderType: 'male' as const
  });

  // Bulk Room State
  const [bulkConfig, setBulkConfig] = useState({
    prefix: '', startNo: 1, count: 10, bedCount: 2, genderType: 'male' as const
  });

  // Edit Room State
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomData, setEditRoomData] = useState<{ roomNumber?: string, bedCount?: number, genderType?: any, status?: any }>({});

  const handleStartEdit = (room: any) => {
    setEditingRoomId(room.id);
    setEditRoomData({
      roomNumber: room.roomNumber,
      bedCount: room.bedCount,
      genderType: room.genderType,
      status: room.status
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

  const availableHotels = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return hotels;
    const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
    return hotels.filter(h => hotelIds.includes(h.id));
  }, [hotels, currentUser]);

  const hotelFacilities = useMemo(() => {
    let facs = facilities.filter(f => f.hotelId === selectedHotelId);
    if (currentUser?.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      facs = facs.filter(f => facIds.includes(f.id));
    }
    return facs;
  }, [facilities, selectedHotelId, currentUser]);
    
  const facilityRooms = rooms.filter(r => r.facilityId === selectedFacilityId);

  const handleAddSingleRoom = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !newRoom.roomNumber || !canEdit) return;
    addRoom({
      facilityId: selectedFacilityId,
      roomNumber: newRoom.roomNumber,
      bedCount: Number(newRoom.bedCount),
      genderType: newRoom.genderType,
      status: 'active'
    });
    setNewRoom({ ...newRoom, roomNumber: '' });
  };

  const handleAddBulkRooms = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || bulkConfig.count <= 0 || !canEdit) return;

    const newRooms = [];
    for (let i = 0; i < bulkConfig.count; i++) {
      newRooms.push({
        facilityId: selectedFacilityId,
        roomNumber: `${bulkConfig.prefix}${bulkConfig.startNo + i}`,
        bedCount: Number(bulkConfig.bedCount),
        genderType: bulkConfig.genderType,
        status: 'active' as const
      });
    }
    addRoomsBulk(newRooms);
    setBulkConfig({ ...bulkConfig, startNo: bulkConfig.startNo + bulkConfig.count });
  };

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Oda Yönetimi"
        description="Oda tipleri, yatak kapasiteleri ve oda durumları burada yönetilecek."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Sidebar - Selection */}
        <div className="lg:col-span-4 card-standard p-6 flex flex-col">
          <h3 className="text-lg font-bold text-[#1A1C18] flex items-center gap-2 mb-6">
            <Building className="w-5 h-5 text-[#7C8363]" />
            Tesis Seçimi
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Otel Seçin</label>
              <select 
                value={selectedHotelId}
                onChange={(e) => {
                  setSelectedHotelId(e.target.value);
                  setSelectedFacilityId('');
                }}
                className="w-full px-4 py-2.5 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-[#FDFCFB]"
              >
                <option value="">Otel Seçiniz...</option>
                {availableHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Lojman Seçin</label>
              <select 
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                disabled={!selectedHotelId || hotelFacilities.length === 0}
                className="w-full px-4 py-2.5 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-[#FDFCFB] disabled:opacity-50"
              >
                <option value="">Lojman Seçiniz...</option>
                {hotelFacilities.map(f => <option key={f.id} value={f.id}>{f.name} (Kapasite: {f.capacity})</option>)}
              </select>
            </div>
          </div>

          {selectedFacilityId && canEdit && (
            <div className="mt-8 pt-6 border-t border-stone-100">
              <h4 className="font-bold text-[#2D332D] mb-4">Oda Ekleme İşlemleri</h4>
              
              <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
                <button 
                  onClick={() => setActiveTab('single')}
                  className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'single' ? "bg-white shadow-sm text-[#2D332D]" : "text-stone-500 hover:text-[#2D332D]")}
                >Tekli Ekle</button>
                <button 
                  onClick={() => setActiveTab('bulk')}
                  className={cn("flex-1 py-1.5 text-xs font-bold rounded-lg transition-all", activeTab === 'bulk' ? "bg-white shadow-sm text-[#2D332D]" : "text-stone-500 hover:text-[#2D332D]")}
                >Toplu Ekle</button>
              </div>

              {activeTab === 'single' ? (
                <form onSubmit={handleAddSingleRoom} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Oda No</label>
                      <input required type="text" value={newRoom.roomNumber} onChange={e => setNewRoom({...newRoom, roomNumber: e.target.value})} placeholder="Örn: 101" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Yatak Sayısı</label>
                      <input required type="number" min="1" value={newRoom.bedCount} onChange={e => setNewRoom({...newRoom, bedCount: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Cinsiyet</label>
                      <select value={newRoom.genderType} onChange={e => setNewRoom({...newRoom, genderType: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                        <option value="mixed">Karma</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#7C8363] text-white rounded-xl text-sm font-semibold hover:bg-[#6A7152] transition-colors flex justify-center items-center gap-2">
                    <Plus className="w-4 h-4" /> Odayı Ekle
                  </button>
                </form>
              ) : (
                <form onSubmit={handleAddBulkRooms} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Ön Ek (İsteğe Bağlı)</label>
                      <input type="text" value={bulkConfig.prefix} onChange={e => setBulkConfig({...bulkConfig, prefix: e.target.value})} placeholder="Örn: A-" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Başlangıç No</label>
                      <input required type="number" value={bulkConfig.startNo} onChange={e => setBulkConfig({...bulkConfig, startNo: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Adet</label>
                      <input required type="number" min="1" value={bulkConfig.count} onChange={e => setBulkConfig({...bulkConfig, count: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Yatak / Oda</label>
                      <input required type="number" min="1" value={bulkConfig.bedCount} onChange={e => setBulkConfig({...bulkConfig, bedCount: parseInt(e.target.value) || 1})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-stone-500 uppercase mb-1">Cinsiyet</label>
                      <select value={bulkConfig.genderType} onChange={e => setBulkConfig({...bulkConfig, genderType: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="male">Erkek</option>
                        <option value="female">Kadın</option>
                        <option value="mixed">Karma</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-[#2D332D] text-white rounded-xl text-sm font-semibold hover:bg-[#1A1C18] transition-colors flex justify-center items-center gap-2">
                    <Copy className="w-4 h-4" /> Toplu Oluştur ({bulkConfig.count} Oda)
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Content - Room List */}
        <div className="lg:col-span-8 card-standard p-6 overflow-y-auto">
          {!selectedFacilityId ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto text-stone-400">
              <BedDouble className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-xl font-bold text-[#2D332D] mb-2">Lojman Seçimi Bekleniyor</h3>
              <p className="text-sm">Odaları görüntülemek veya yeni oda eklemek için sol taraftan bir otel ve lojman seçin.</p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#2D332D] flex items-center gap-2">
                    {facilities.find(f => f.id === selectedFacilityId)?.name} Odaları
                  </h3>
                  <p className="text-sm text-stone-500 mt-1">Toplam {facilityRooms.length} oda bulundu.</p>
                </div>
              </div>

              {facilityRooms.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-[#E8E6E1] rounded-3xl">
                  <p className="text-stone-500">Bu lojmanda henüz oda kaydı yok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {facilityRooms.map(room => (
                    editingRoomId === room.id ? (
                      <div key={room.id} className="bg-[#FDFCFB] border-2 border-[#7C8363] rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] uppercase font-bold text-stone-500">Oda No</label>
                           <input type="text" value={editRoomData.roomNumber || ''} onChange={e => setEditRoomData({...editRoomData, roomNumber: e.target.value})} className="px-2 py-1 text-sm border rounded focus:outline-none focus:border-[#7C8363]" />
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] uppercase font-bold text-stone-500">Yatak Sayısı</label>
                           <input type="number" min="1" value={editRoomData.bedCount || 1} onChange={e => setEditRoomData({...editRoomData, bedCount: parseInt(e.target.value) || 1})} className="px-2 py-1 text-sm border rounded focus:outline-none focus:border-[#7C8363]" />
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] uppercase font-bold text-stone-500">Tür</label>
                           <select value={editRoomData.genderType} onChange={e => setEditRoomData({...editRoomData, genderType: e.target.value})} className="px-2 py-1 text-sm border rounded focus:outline-none focus:border-[#7C8363]">
                             <option value="male">Erkek</option>
                             <option value="female">Kadın</option>
                             <option value="mixed">Karma</option>
                           </select>
                        </div>
                        <div className="flex flex-col gap-1">
                           <label className="text-[10px] uppercase font-bold text-stone-500">Durum</label>
                           <select value={editRoomData.status} onChange={e => setEditRoomData({...editRoomData, status: e.target.value})} className="px-2 py-1 text-sm border rounded focus:outline-none focus:border-[#7C8363]">
                             <option value="active">Aktif</option>
                             <option value="maintenance">Bakımda</option>
                             <option value="inactive">Pasif</option>
                           </select>
                        </div>
                        <div className="flex gap-2 mt-2">
                           <button onClick={handleSaveEdit} className="flex-1 py-1.5 bg-[#7C8363] hover:bg-[#6A7152] transition-colors text-white rounded-lg flex items-center justify-center" title="Kaydet">
                             <Check className="w-4 h-4" />
                           </button>
                           <button onClick={handleCancelEdit} className="flex-1 py-1.5 bg-stone-200 hover:bg-stone-300 transition-colors text-stone-700 rounded-lg flex items-center justify-center" title="İptal">
                             <X className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                    ) : (
                    <div key={room.id} className="relative group bg-[#FDFCFB] border border-[#E8E6E1] rounded-2xl p-4 hover:border-[#7C8363] hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-mono font-bold text-lg text-[#2D332D]">{room.roomNumber}</span>
                        <div className={cn("w-2 h-2 rounded-full mt-2", room.status === 'active' ? "bg-green-500" : room.status === 'maintenance' ? "bg-orange-500" : "bg-red-500")} />
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-xs text-stone-500 flex justify-between">
                          <span>Yatak:</span> <span className="font-bold text-[#1A1C18]">{room.bedCount}</span>
                        </p>
                        <p className="text-xs text-stone-500 flex justify-between">
                          <span>Tür:</span> <span className="font-bold text-[#1A1C18]">
                            {room.genderType === 'male' ? 'Erkek' : room.genderType === 'female' ? 'Kadın' : 'Karma'}
                          </span>
                        </p>
                      </div>

                      {canEdit && (
                        <div className="absolute inset-0 bg-[#2D332D]/90 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button onClick={() => handleStartEdit(room)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Düzenle">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteRoom(room.id)} className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg text-red-200 transition-colors" title="Sil">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    )
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
