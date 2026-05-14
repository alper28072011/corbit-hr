import { useState, useEffect, useMemo, useRef } from "react";
import { BedDouble, Plus, Copy, Trash2, Edit2, Building, AlertCircle, ShieldAlert, Check, X, Search, Filter, Upload, Download } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";
import * as XLSX from "xlsx";

export default function RoomManagement() {
  const { hotels, facilities, rooms, addRoom, addRoomsBulk, updateRoom, deleteRoom, currentUser, roles } = useStore();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'excel'>('single');
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

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

  const selectedFac = availableFacilities.find(f => f.id === selectedFacilityId);
  const currentRoomSum = facilityRooms.length; // From filtered rooms, wait - it should be ALL rooms in that facility
  const allFacRooms = rooms.filter(r => r.facilityId === selectedFacilityId);
  const totalRoomSumInFac = allFacRooms.length;
  const totalBedSumInFac = allFacRooms.reduce((sum, r) => sum + r.bedCount, 0);

  const roomCapacityLimit = selectedFac?.roomCapacity || 0;
  const bedCapacityLimit = selectedFac?.bedCapacity || 0;
  
  const availableRoomSlots = Math.max(0, roomCapacityLimit - totalRoomSumInFac);
  const availableBedSlots = Math.max(0, bedCapacityLimit - totalBedSumInFac);

  const isRoomLimitReached = totalRoomSumInFac >= roomCapacityLimit && roomCapacityLimit > 0;
  const isBedLimitReached = totalBedSumInFac >= bedCapacityLimit && bedCapacityLimit > 0;

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Oda No', 'Blok', 'Kat', 'Kapasite (Yatak)', 'Cinsiyet (Erkek/Kadin/Karma)', 'Aciklama'],
      ['101', 'A Blok', '1. Kat', 3, 'Erkek', 'Balkonlu'],
      ['102', 'B Blok', '2. Kat', 2, 'Kadin', '']
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Odalar");
    XLSX.writeFile(wb, "rooms_template.xlsx");
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

    if (roomCapacityLimit > 0 && totalRoomSumInFac + 1 > roomCapacityLimit) {
      alert(`Oda kapasitesi aşıldı! En fazla ${roomCapacityLimit} oda eklenebilir.`);
      return;
    }
    if (bedCapacityLimit > 0 && totalBedSumInFac + Number(newRoom.bedCount) > bedCapacityLimit) {
      alert(`Yatak kapasitesi aşıldı! En fazla ${availableBedSlots} yatak daha eklenebilir.`);
      return;
    }

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

  const handleExcelUpload = async (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!excelFile || !selectedFacilityId || !canEdit) return;
    
    setImporting(true);
    try {
      const data = await excelFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'buffer' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const items: any[] = XLSX.utils.sheet_to_json(ws);
      
      const newRooms: any[] = [];
      let totalBedsToImport = 0;

      for (const item of items) {
         let bedCount = parseInt(item['Kapasite (Yatak)']) || 1;
         totalBedsToImport += bedCount;
         let genderInput = (item['Cinsiyet (Erkek/Kadin/Karma)'] || '').toLowerCase();
         let gType = 'male';
         if (genderInput.includes('kadin') || genderInput.includes('kadın')) gType = 'female';
         if (genderInput.includes('karma')) gType = 'mixed';

         newRooms.push({
           facilityId: selectedFacilityId,
           roomNumber: String(item['Oda No'] || ''),
           block: String(item['Blok'] || ''),
           floor: String(item['Kat'] || ''),
           bedCount: bedCount,
           genderType: gType,
           status: 'active' as const,
           notes: String(item['Aciklama'] || item['Açıklama'] || '')
         });
      }

      if (roomCapacityLimit > 0 && totalRoomSumInFac + newRooms.length > roomCapacityLimit) {
         alert(`Lojman oda kapasitesini aşıyorsunuz! Maksimum ${availableRoomSlots} oda daha eklenebilir.`);
         setImporting(false);
         return;
      }
      if (bedCapacityLimit > 0 && totalBedSumInFac + totalBedsToImport > bedCapacityLimit) {
         alert(`Lojman yatak kapasitesini aşıyorsunuz! Maksimum ${availableBedSlots} yatak daha eklenebilir.`);
         setImporting(false);
         return;
      }

      if (newRooms.length > 0) {
        // Assume addRoomsBulk handles batch writes in useStore
        await addRoomsBulk(newRooms);
      }
      
      setShowAddForm(false);
      setExcelFile(null);
    } catch (err) {
      alert("Excel dosyası okunurken bir hata oluştu.");
      console.error(err);
    } finally {
      setImporting(false);
    }
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
      <div className="card-standard p-4 flex flex-col items-stretch gap-4 bg-[#FDFCFB] shrink-0">
        <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
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
              {availableFacilities.map(f => {
                return <option key={f.id} value={f.id} className="bg-white text-stone-700">{f.name}</option>;
              })}
            </select>
          </div>
        </div>

        {selectedFacilityId && selectedFac && (roomCapacityLimit > 0 || bedCapacityLimit > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-stone-700 uppercase tracking-wider">Oda Kapasitesi</span>
                <span className={cn("text-xs font-bold", isRoomLimitReached ? "text-red-600" : "text-stone-500")}>
                  {totalRoomSumInFac} / {roomCapacityLimit} <span className="opacity-75 font-medium ml-1">({availableRoomSlots} Oda Eklenebilir)</span>
                </span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", isRoomLimitReached ? "bg-red-500" : "bg-[#7C8363]")}
                  style={{ width: `${roomCapacityLimit > 0 ? Math.min(100, (totalRoomSumInFac / roomCapacityLimit) * 100) : 0}%` }}
                />
              </div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-stone-700 uppercase tracking-wider">Yatak Kapasitesi</span>
                <span className={cn("text-xs font-bold", isBedLimitReached ? "text-red-600" : "text-stone-500")}>
                  {totalBedSumInFac} / {bedCapacityLimit} <span className="opacity-75 font-medium ml-1">({availableBedSlots} Yatak Eklenebilir)</span>
                </span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", isBedLimitReached ? "bg-red-500" : "bg-[#7C8363]")}
                  style={{ width: `${bedCapacityLimit > 0 ? Math.min(100, (totalBedSumInFac / bedCapacityLimit) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 shrink-0 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl min-h-[450px] max-h-[90vh] flex flex-col overflow-hidden">
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
                >1. Tekli Kayıt</button>
                <button 
                  onClick={() => setActiveTab('excel')}
                  className={cn("px-6 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'excel' ? "bg-[#7C8363] shadow-sm text-white" : "text-stone-500 hover:text-[#2D332D]")}
                >2. Excel ile Yükle</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col">
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
                <form id="excelRoomForm" onSubmit={handleExcelUpload} className="flex flex-col flex-1 gap-6 justify-center">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-blue-900 mb-1">Toplu Oda Yükleme Sistemi</h4>
                      <p className="text-xs text-blue-800 mb-3">Sisteme odaları hızlı bir şekilde dahil edebilmek için hazırladığımız özel Excel formatını kullanmalısınız. Yükleme esnasında belirlenen lojman kapasitesi sınırları dikkate alınacaktır.</p>
                      <button type="button" onClick={handleDownloadTemplate} className="text-sm font-semibold bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                         <Download className="w-4 h-4" /> Şablonu İndir
                      </button>
                    </div>
                  </div>

                  <div>
                     <label className="block text-xs font-semibold text-stone-500 uppercase mb-2">Excel Dosyası (.xlsx)</label>
                     <div className="relative group">
                       <input 
                         required 
                         type="file" 
                         accept=".xlsx, .xls"
                         onChange={e => setExcelFile(e.target.files?.[0] || null)}
                         className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                       />
                       <div className={cn("w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors group-hover:bg-stone-50", excelFile ? "border-[#7C8363] bg-[#7C8363]/5" : "border-[#E8E6E1] bg-white")}>
                         <Upload className={cn("w-8 h-8 mb-3", excelFile ? "text-[#7C8363]" : "text-stone-300")} />
                         <span className="text-sm font-semibold text-stone-700">{excelFile ? excelFile.name : "Dosya seçmek için tıklayın veya sürükleyin"}</span>
                         {!excelFile && <span className="text-xs text-stone-500 mt-1">Sadece .xlsx ve .xls dosyaları</span>}
                       </div>
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
                form={activeTab === 'single' ? "singleRoomForm" : "excelRoomForm"} 
                disabled={importing || (activeTab === 'excel' && !excelFile)}
                className="px-6 py-2.5 bg-[#7C8363] text-white rounded-xl font-semibold hover:bg-[#6A7152] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {activeTab === 'single' ? <><Plus className="w-4 h-4"/> Ekle</> : importing ? 'Yükleniyor...' : <><Upload className="w-4 h-4"/> Yükle</>}
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
