import React, { useState, useEffect } from "react";
import { Plus, Hotel as HotelIcon, Building, Trash2, Edit2, Check, X, ShieldAlert } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { PAGE_KEYS, canViewPage, can } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";

export default function FacilityManagement() {
  const { hotels, facilities, addHotel, deleteHotel, updateHotel, addFacility, updateFacility, deleteFacility, currentUser, roles } = useStore();
  
  const [activeTab, setActiveTab] = useState<'hotels' | 'dorms'>('hotels');
  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showDormForm, setShowDormForm] = useState(false);

  if (!canViewPage(currentUser?.role, PAGE_KEYS.facilities, useStore.getState().rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const canManage = can(currentUser?.role, 'edit_facilities', PAGE_KEYS.facilities, useStore.getState().rolesPermissions);

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="shrink-0">
        <PageHeader
          title="Tesis Yönetimi"
          description="Oteller, lojman binaları ve otel-lojman bağlantı izinlerinin yönetimi."
        />
      </div>
        
      <div className="card-standard p-4 flex flex-col md:flex-row justify-between gap-4 bg-[#FDFCFB] shrink-0 md:items-center">
        <div className="flex bg-stone-100 p-0.5 rounded-xl w-fit border border-[#E8E6E1]">
          <button 
            onClick={() => setActiveTab('hotels')}
            className={cn("px-6 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2", 
              activeTab === 'hotels' ? "bg-white shadow-sm text-[#2D332D]" : "text-stone-500 hover:text-[#2D332D]"
            )}
          >
            <HotelIcon className="w-4 h-4" /> Oteller
          </button>
          <button 
            onClick={() => setActiveTab('dorms')}
            className={cn("px-6 py-1.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2", 
              activeTab === 'dorms' ? "bg-white shadow-sm text-[#2D332D]" : "text-stone-500 hover:text-[#2D332D]"
            )}
          >
            <Building className="w-4 h-4" /> Lojmanlar
          </button>
        </div>

        {canManage && (
          <div>
            {activeTab === 'hotels' ? (
              !showHotelForm && (
                <button 
                  onClick={() => setShowHotelForm(true)}
                  className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Yeni Otel Ekle
                </button>
              )
            ) : (
              !showDormForm && (
                <button 
                  onClick={() => {
                    const evt = new CustomEvent('openDormForm');
                    window.dispatchEvent(evt);
                  }}
                  className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Yeni Lojman Ekle
                </button>
              )
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {activeTab === 'hotels' ? (
          <HotelsTab 
            hotels={hotels} 
            canManage={canManage} 
            addHotel={addHotel}
            updateHotel={updateHotel}
            showForm={showHotelForm}
            setShowForm={setShowHotelForm}
            deleteHotel={(id: string) => {
              if (confirm('Oteli silmek istediğinize emin misiniz?')) deleteHotel(id);
            }} 
          />
        ) : (
          <DormsTab 
            facilities={facilities} 
            hotels={hotels} 
            canManage={canManage}
            addFacility={addFacility}
            updateFacility={updateFacility}
            showForm={showDormForm}
            setShowForm={setShowDormForm}
            deleteFacility={(id: string) => {
              if (confirm('Lojmanı silmek istediğinize emin misiniz?')) deleteFacility(id);
            }}
          />
        )}
      </div>
    </div>
  );
}

// --- HOTELS TAB ---

function HotelsTab({ hotels, canManage, addHotel, updateHotel, deleteHotel, showForm, setShowForm }: any) {
  const [formData, setFormData] = useState({ name: '', branchCode: '', status: 'active' as const });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', branchCode: '', status: 'active' as const });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    addHotel({ name: formData.name.trim(), branchCode: formData.branchCode.trim().toUpperCase() || undefined, status: formData.status as 'active' | 'passive' });
    setFormData({ name: '', branchCode: '', status: 'active' });
    setShowForm(false);
  };

  const handleUpdate = () => {
    if (!editData.name.trim() || !editingId) return;
    updateHotel(editingId, { name: editData.name.trim(), branchCode: editData.branchCode.trim().toUpperCase() || undefined, status: editData.status });
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ... Removed old wrapper div where the button was ... */}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-stone-50 border border-[#E8E6E1] rounded-xl flex items-end gap-4 shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Şube Kodu</label>
            <input type="text" value={formData.branchCode} onChange={e => setFormData({...formData, branchCode: e.target.value})} className="w-full px-3 py-2 border border-[#E8E6E1] rounded-lg text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Örn: RPL" />
          </div>
          <div className="flex-[2]">
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Otel Adı</label>
            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-[#E8E6E1] rounded-lg text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Örn: Grand Hotel" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Durum</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-3 py-2 border border-[#E8E6E1] rounded-lg text-sm focus:outline-none focus:border-[#7C8363]">
              <option value="active">Aktif</option>
              <option value="passive">Pasif</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="py-2 px-4 bg-[#7C8363] text-white rounded-lg text-sm font-semibold hover:bg-[#6A7152]">Ekle</button>
            <button type="button" onClick={() => setShowForm(false)} className="py-2 px-4 bg-white border border-[#E8E6E1] text-stone-600 rounded-lg text-sm font-semibold hover:bg-stone-50">İptal</button>
          </div>
        </form>
      )}

      <div className="card-standard flex flex-col bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left relative">
          <thead className="bg-[#FDFCFB] sticky top-0 z-10 shadow-sm border-b border-[#E8E6E1]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider w-32">Şube Kodu</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Otel Adı</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider w-32">Durum</th>
              {canManage && <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right w-32">İşlemler</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E6E1] bg-white">
            {hotels.length === 0 ? (
              <tr><td colSpan={canManage ? 4 : 3} className="px-6 py-8 text-center text-stone-500">Henüz otel eklenmemiş.</td></tr>
            ) : (
              hotels.map((hotel: any) => (
                <tr key={hotel.id} className="hover:bg-stone-50 transition-colors">
                  {editingId === hotel.id ? (
                    <>
                      <td className="px-6 py-3"><input type="text" value={editData.branchCode} onChange={e => setEditData({...editData, branchCode: e.target.value})} className="w-full px-2 py-1 text-sm border rounded uppercase" placeholder="RPL" /></td>
                      <td className="px-6 py-3"><input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full px-2 py-1 text-sm border rounded" /></td>
                      <td className="px-6 py-3">
                        <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value as any})} className="px-2 py-1 text-sm border rounded w-full">
                          <option value="active">Aktif</option>
                          <option value="passive">Pasif</option>
                        </select>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleUpdate} className="p-1.5 bg-[#7C8363] text-white rounded hover:bg-[#6A7152]" title="Kaydet"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 bg-stone-200 text-stone-700 rounded hover:bg-stone-300" title="İptal"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono text-sm text-stone-600">{hotel.branchCode || '-'}</td>
                      <td className="px-6 py-4 font-semibold text-stone-800">{hotel.name}</td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-semibold", hotel.status === 'active' ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600")}>
                          {hotel.status === 'active' ? 'AKTİF' : 'PASİF'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setEditingId(hotel.id); setEditData({ name: hotel.name, branchCode: hotel.branchCode || '', status: hotel.status }); }} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteHotel(hotel.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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
      </div>
    </div>
  );
}

// --- DORMS TAB ---

function DormsTab({ facilities, hotels, canManage, addFacility, updateFacility, deleteFacility, showForm, setShowForm }: any) {
  const initialForm = {
    name: '',
    address: '',
    contactPerson: '',
    contactPhone: '',
    roomCapacity: 0,
    bedCapacity: 0,
    status: 'active' as const,
    allowedHotelIds: [] as string[]
  };
  
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const handleOpenDormForm = () => {
      setFormData(initialForm);
      setEditingId(null);
      setShowForm(true);
    };
    window.addEventListener('openDormForm', handleOpenDormForm);
    return () => window.removeEventListener('openDormForm', handleOpenDormForm);
  }, []);

  const toggleHotelSelection = (hotelId: string) => {
    setFormData(prev => ({
      ...prev,
      allowedHotelIds: prev.allowedHotelIds.includes(hotelId) 
        ? prev.allowedHotelIds.filter(id => id !== hotelId)
        : [...prev.allowedHotelIds, hotelId]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingId) {
      updateFacility(editingId, {
        name: formData.name.trim(),
        address: formData.address,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        roomCapacity: Number(formData.roomCapacity),
        bedCapacity: Number(formData.bedCapacity),
        status: formData.status,
        allowedHotelIds: formData.allowedHotelIds
      });
      setEditingId(null);
    } else {
      addFacility({
        name: formData.name.trim(),
        address: formData.address,
        contactPerson: formData.contactPerson,
        contactPhone: formData.contactPhone,
        roomCapacity: Number(formData.roomCapacity),
        bedCapacity: Number(formData.bedCapacity),
        status: formData.status,
        allowedHotelIds: formData.allowedHotelIds
      } as any);
    }
    
    setFormData(initialForm);
    setShowForm(false);
  };

  const handleEdit = (fac: any) => {
    setFormData({
      name: fac.name,
      address: fac.address || '',
      contactPerson: fac.contactPerson || '',
      contactPhone: fac.contactPhone || '',
      roomCapacity: fac.roomCapacity || 0,
      bedCapacity: fac.bedCapacity || 0,
      status: fac.status || 'active',
      allowedHotelIds: fac.allowedHotelIds || (fac.hotelId ? [fac.hotelId] : [])
    });
    setEditingId(fac.id);
    setShowForm(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ... Removed old wrapper div where the button was ... */}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-[#FDFCFB] border border-[#E8E6E1] rounded-2xl overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#E8E6E1] bg-white flex justify-between items-center">
            <h4 className="font-bold text-[#2D332D]">{editingId ? 'Lojmanı Düzenle' : 'Yeni Lojman Kaydı'}</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Lojman Adı *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Örn: Merkez Lojman" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Oda Kapasitesi *</label>
                  <input required min="1" type="number" value={formData.roomCapacity || ''} onChange={e => setFormData({...formData, roomCapacity: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Oda sayısı" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yatak Kapasitesi *</label>
                  <input required min="1" type="number" value={formData.bedCapacity || ''} onChange={e => setFormData({...formData, bedCapacity: parseInt(e.target.value) || 0})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Yatak sayısı" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Yetkili İletişim</label>
                  <input type="text" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Telefon numarası..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Durum *</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
                    <option value="active">Aktif</option>
                    <option value="passive">Pasif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">İlgili Kişi / İletişim</label>
                <input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Ad Soyad..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Adres</label>
                <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] resize-none" placeholder="Açık adres..." />
              </div>
            </div>

            <div className="bg-stone-50 border border-[#E8E6E1] rounded-xl p-4 flex flex-col">
              <label className="block text-sm font-bold text-[#2D332D] mb-1">İzin Verilen Oteller</label>
              <p className="text-xs text-stone-500 mb-4">Bu lojmanda hangi otellerin personeli konaklayabilir?</p>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px] border border-stone-200 rounded-lg p-2 bg-white">
                {hotels.map((hotel: any) => (
                  <label key={hotel.id} className="flex items-center gap-3 p-2 hover:bg-stone-50 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formData.allowedHotelIds.includes(hotel.id)}
                      onChange={() => toggleHotelSelection(hotel.id)}
                      className="w-4 h-4 text-[#7C8363] border-gray-300 rounded focus:ring-[#7C8363]"
                    />
                    <span className="text-sm font-medium text-stone-700">{hotel.name}</span>
                  </label>
                ))}
                {hotels.length === 0 && <p className="text-sm text-stone-400 p-2">Sistemde kayıtlı otel bulunmuyor.</p>}
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-[#E8E6E1] bg-stone-50 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl text-sm font-semibold hover:bg-stone-50">İptal</button>
            <button type="submit" className="px-6 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold hover:bg-[#6A7152] flex items-center gap-2">
              <Check className="w-4 h-4" /> {editingId ? 'Güncelle' : 'Lojmanı Kaydet'}
            </button>
          </div>
        </form>
      )}

      <div className="card-standard flex flex-col bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left relative">
          <thead className="bg-[#FDFCFB] sticky top-0 z-10 shadow-sm border-b border-[#E8E6E1]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Lojman Adı</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">İzin Verilen Oteller</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">İlgili Kişi</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-center">Kapasite (Oda / Yatak)</th>
              <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Durum</th>
              {canManage && <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E6E1] bg-white">
            {facilities.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-stone-500">Henüz lojman eklenmemiş.</td></tr>
            ) : (
              facilities.map((fac: any) => {
                const allowedHotels = fac.allowedHotelIds?.map((id: string) => hotels.find((h: any) => h.id === id)).filter(Boolean) || [];
                return (
                  <tr key={fac.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-stone-800">{fac.name}</p>
                      {fac.address && <p className="text-xs text-stone-500 truncate max-w-[200px]" title={fac.address}>{fac.address}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {allowedHotels.length > 0 ? allowedHotels.map((h: any) => (
                          <span key={h.id} className="inline-flex px-2 py-0.5 rounded border border-stone-200 bg-white text-[10px] font-semibold text-stone-600 shadow-sm">
                            {h.name}
                          </span>
                        )) : (
                          <span className="text-xs text-stone-400 italic">Yok</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-stone-700 truncate max-w-[150px]">{fac.contactPerson || '-'}</span>
                        {fac.contactPhone && <span className="text-xs text-stone-500 truncate max-w-[150px]">{fac.contactPhone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-[#2D332D]">{fac.roomCapacity} Oda</span>
                        <span className="text-xs text-stone-500">{fac.bedCapacity} Yatak</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-semibold", fac.status === 'active' ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-600")}>
                        {fac.status === 'active' ? 'AKTİF' : 'PASİF'}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(fac)} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteFacility(fac.id)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}



