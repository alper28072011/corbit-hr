import { useState } from "react";
import { Plus, Hotel as HotelIcon, Building, Trash2, Edit2, ChevronRight, Inbox, ShieldAlert } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PERMISSIONS, hasPermission } from "../lib/permissions";

export default function FacilityManagement() {
  const { hotels, facilities, addHotel, deleteHotel, addFacility, deleteFacility, currentUser } = useStore();
  
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  
  // Modals/Forms State
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [newHotelName, setNewHotelName] = useState("");
  const [hotelError, setHotelError] = useState("");

  const [showFacilityForm, setShowFacilityForm] = useState(false);
  const [facilityData, setFacilityData] = useState({ name: "", capacity: 0 });
  const [facilityError, setFacilityError] = useState("");

  if (!hasPermission(currentUser?.role, PERMISSIONS.view_hotel_management)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const canManage = hasPermission(currentUser?.role, PERMISSIONS.edit_hotel_management);

  const handleAddHotel = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newHotelName.trim() || !canManage) {
      setHotelError("Geçersiz işlem.");
      return;
    }
    addHotel({ name: newHotelName.trim(), status: 'active' });
    setNewHotelName("");
    setShowHotelForm(false);
    setHotelError("");
  };

  const handleAddFacility = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!selectedHotelId || !canManage) return;
    if (!facilityData.name.trim()) {
      setFacilityError("Lojman adı boş bırakılamaz.");
      return;
    }
    if (facilityData.capacity <= 0) {
      setFacilityError("Kapasite sıfırdan büyük olmalıdır.");
      return;
    }
    addFacility({ 
      name: facilityData.name.trim(), 
      capacity: Number(facilityData.capacity), 
      hotelId: selectedHotelId, 
      status: 'active' 
    });
    setFacilityData({ name: "", capacity: 0 });
    setShowFacilityForm(false);
    setFacilityError("");
  };

  const selectedHotelFacilities = facilities.filter(f => f.hotelId === selectedHotelId);

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-[#2D332D]">Tesis Yönetimi</h2>
        <p className="text-stone-500 mt-1">Oteller, lojman binaları ve kat planları yönetimi.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol Panel - Oteller Listesi */}
        <div className="lg:col-span-4 bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-[#1A1C18] flex items-center gap-2">
              <HotelIcon className="w-5 h-5 text-[#7C8363]" />
              Oteller
            </h3>
            {canManage && (
              <button 
                onClick={() => setShowHotelForm(true)}
                className="p-2 bg-[#F5F2ED] text-[#7C8363] rounded-full hover:bg-[#E8E6E1] transition-colors"
                title="Yeni Otel Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showHotelForm && (
            <form onSubmit={handleAddHotel} className="mb-4 bg-[#FDFCFB] p-4 rounded-xl border border-[#E8E6E1]">
              <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Otel Adı</label>
              <input
                type="text"
                value={newHotelName}
                onChange={(e) => setNewHotelName(e.target.value)}
                placeholder="Örn: Grand Hotel Resort"
                className="w-full px-3 py-2 border border-[#E8E6E1] rounded-lg text-sm focus:outline-none focus:border-[#7C8363]"
              />
              {hotelError && <p className="text-red-500 text-xs mt-1">{hotelError}</p>}
              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 bg-[#7C8363] text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-[#6A7152] transition-colors">Kaydet</button>
                <button type="button" onClick={() => {setShowHotelForm(false); setHotelError("");}} className="flex-1 border border-[#E8E6E1] text-stone-600 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-50 transition-colors">İptal</button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {hotels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-stone-400">
                <Inbox className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-sm">Henüz otel eklenmedi.</p>
              </div>
            ) : (
              hotels.map(hotel => (
                <div 
                  key={hotel.id}
                  onClick={() => setSelectedHotelId(hotel.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl cursor-pointer border transition-all",
                    selectedHotelId === hotel.id 
                      ? "bg-[#2D332D] text-white border-[#2D332D]" 
                      : "bg-white text-[#1A1C18] border-[#E8E6E1] hover:border-[#7C8363] hover:shadow-sm"
                  )}
                >
                  <div>
                    <p className="font-semibold text-sm">{hotel.name}</p>
                    <p className={cn("text-xs mt-0.5", selectedHotelId === hotel.id ? "text-stone-300" : "text-stone-500")}>
                      {facilities.filter(f => f.hotelId === hotel.id).length} Lojman
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteHotel(hotel.id); if(selectedHotelId === hotel.id) setSelectedHotelId(null); }}
                      className={cn("p-1.5 rounded-md opacity-60 hover:opacity-100 transition-opacity", selectedHotelId === hotel.id ? "hover:bg-white/10" : "hover:bg-stone-100 text-red-500")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className={cn("w-4 h-4", selectedHotelId === hotel.id ? "text-white" : "text-stone-300")} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sağ Panel - Lojmanlar (Tesisler) Listesi */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col h-[600px]">
          {!selectedHotelId ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-[#F5F2ED] rounded-full flex items-center justify-center mb-4">
                <Building className="w-8 h-8 text-[#7C8363]" />
              </div>
              <h3 className="text-xl font-serif font-bold text-[#2D332D] mb-2">Lojmanları Görüntülemek İçin Bir Otel Seçin</h3>
              <p className="text-stone-500 text-sm">Soldaki listeden bir otel seçerek, o otele bağlı personel lojmanlarını ve kapasite durumlarını yönetebilirsiniz.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
                <div>
                  <h3 className="text-xl font-bold text-[#1A1C18] flex items-center gap-2">
                    <Building className="w-6 h-6 text-[#7C8363]" />
                    Bağlı Lojmanlar
                  </h3>
                  <p className="text-sm text-stone-500 mt-1">
                    {hotels.find(h => h.id === selectedHotelId)?.name} tesisine ait lojman binaları
                  </p>
                </div>
                {canManage && (
                  <button 
                    onClick={() => setShowFacilityForm(true)}
                    className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors"
                  >
                    + Yeni Lojman Binası
                  </button>
                )}
              </div>

              {showFacilityForm && (
                <form onSubmit={handleAddFacility} className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#FDFCFB] p-6 rounded-2xl border border-[#E8E6E1]">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Lojman / Bina Adı</label>
                    <input
                      type="text"
                      value={facilityData.name}
                      onChange={(e) => setFacilityData({...facilityData, name: e.target.value})}
                      placeholder="Örn: C Blok Lojman"
                      className="w-full px-4 py-2.5 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Tam Kapasite (Kişi)</label>
                    <input
                      type="number"
                      value={facilityData.capacity || ""}
                      onChange={(e) => setFacilityData({...facilityData, capacity: parseInt(e.target.value) || 0})}
                      placeholder="Örn: 100"
                      className="w-full px-4 py-2.5 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 mt-2">
                    {facilityError && <p className="text-red-500 text-xs self-center mr-auto">{facilityError}</p>}
                    <button type="button" onClick={() => {setShowFacilityForm(false); setFacilityError("");}} className="px-5 py-2 border border-[#E8E6E1] text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors">İptal</button>
                    <button type="submit" className="px-5 py-2 bg-[#2D332D] text-white rounded-xl text-sm font-semibold hover:bg-[#1A1C18] transition-colors">Lojmanı Kaydet</button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                {selectedHotelFacilities.length === 0 ? (
                   <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#E8E6E1] rounded-2xl text-stone-400">
                     <p className="text-sm">Bu otele ait henüz lojman tanımlanmamış.</p>
                   </div>
                ) : (
                  selectedHotelFacilities.map(facility => (
                    <div key={facility.id} className="group relative bg-[#FDFCFB] p-6 rounded-2xl border border-[#E8E6E1] hover:shadow-md hover:border-[#7C8363] transition-all flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-[#2D332D] text-lg">{facility.name}</h4>
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", facility.status === 'active' ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600")}>
                          {facility.status === 'active' ? 'AKTİF' : 'PASİF'}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 mt-2 mb-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Kapasite</p>
                          <p className="text-lg font-mono font-semibold text-[#1A1C18]">{facility.capacity} <span className="text-sm font-sans text-stone-500 font-normal">Kişi</span></p>
                        </div>
                      </div>
                      
                      {canManage && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button className="p-2 bg-white border border-[#E8E6E1] text-stone-600 rounded-lg hover:border-[#7C8363] hover:text-[#7C8363] transition-colors shadow-sm">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => deleteFacility(facility.id)}
                            className="p-2 bg-white border border-[#E8E6E1] text-red-500 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

