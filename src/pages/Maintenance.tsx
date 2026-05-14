import { useState } from "react";
import { Plus, Wrench, Clock, CheckCircle2, AlertCircle, MapPin, Trash2, ChevronRight } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn } from "../lib/utils";
import { MaintenanceStatus } from "../types";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "../components/layout/PageHeader";

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Az önce";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} Dakika Önce`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} Saat Önce`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} Gün Önce`;
}

export default function Maintenance() {
  const { hotels, facilities, rooms, maintenanceRequests, addMaintenanceRequest, updateMaintenanceStatus, deleteMaintenanceRequest, currentUser, roles } = useStore();
  
  const [showForm, setShowForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    facilityId: '',
    roomId: '',
    reporterName: '',
    description: ''
  });

  if (!hasPermission(currentUser?.role, PERMISSION_KEYS.view_maintenance, roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  const canManage = hasPermission(currentUser?.role, PERMISSION_KEYS.manage_maintenance, roles);

  const handleAddRequest = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newRequest.facilityId || !newRequest.reporterName || !newRequest.description || !canManage) return;
    
    addMaintenanceRequest({
      facilityId: newRequest.facilityId,
      roomId: newRequest.roomId || undefined,
      reporterName: newRequest.reporterName,
      description: newRequest.description
    });
    
    setShowForm(false);
    setNewRequest({ facilityId: '', roomId: '', reporterName: '', description: '' });
  };

  const visibleRequests = currentUser?.role === 'facility_manager' 
    ? maintenanceRequests.filter(req => {
        const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
        return facIds.includes(req.facilityId);
      })
    : maintenanceRequests;

  const getColItems = (status: MaintenanceStatus) => {
    return visibleRequests.filter(req => req.status === status).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const openTickets = getColItems('open');
  const inProgressTickets = getColItems('in_progress');
  const resolvedTickets = getColItems('resolved');

  const facilityRoomsForForm = rooms.filter(r => r.facilityId === newRequest.facilityId);

  const getFacilityName = (id: string) => facilities.find(f => f.id === id)?.name || 'Bilinmiyor';
  const getRoomName = (id?: string) => rooms.find(r => r.id === id)?.roomNumber || 'Ortak Alan';

  const KanbanColumn = ({ title, status, items, icon: Icon, colorClass, borderClass }: { title: string, status: MaintenanceStatus, items: typeof openTickets, icon: any, colorClass: string, borderClass: string }) => (
    <div className="flex flex-col card-standard bg-stone-50 p-6 h-full">
      <div className="flex justify-between items-center mb-6 px-2">
        <h3 className="font-bold text-lg text-[#1A1C18] flex items-center gap-2">
          <Icon className={cn("w-5 h-5", colorClass)} />
          {title}
        </h3>
        <span className="bg-white border border-[#E8E6E1] text-[#2D332D] font-bold text-sm px-3 py-1 rounded-full shadow-sm">
          {items.length}
        </span>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-stone-400 border-2 border-dashed border-[#E8E6E1] rounded-2xl">
            <p className="text-sm">Kayıt Bulunmuyor</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className={cn("bg-white p-5 rounded-2xl shadow-sm border-l-4 hover:shadow-md transition-shadow relative group", borderClass)}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  {formatTimeAgo(item.createdAt)}
                </span>
                
                {canManage && (
                  <button 
                    onClick={() => deleteMaintenanceRequest(item.id)}
                    className="p-1.5 bg-red-50 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <p className="font-semibold text-[#1A1C18] mb-4 text-sm leading-relaxed">{item.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-xs text-stone-600 bg-stone-50 p-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-medium">{getFacilityName(item.facilityId)}</span>
                  <span className="text-stone-300">•</span>
                  <span className="font-mono">{getRoomName(item.roomId)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-600 px-2">
                  <span className="font-bold text-[#7C8363]">Bildiren:</span>
                  <span>{item.reporterName}</span>
                </div>
              </div>

              {/* Actions based on status */}
              <div className="flex border-t border-stone-100 pt-3 mt-auto gap-2">
                {status === 'open' && canManage && (
                   <button 
                     onClick={() => updateMaintenanceStatus(item.id, 'in_progress')}
                     className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
                   >
                     İşleme Al
                   </button>
                )}
                {status === 'open' && !canManage && (
                   <span className="flex-1 text-center py-2 text-xs font-bold text-stone-400">Bekliyor</span>
                )}
                {status === 'in_progress' && canManage && (
                   <button 
                     onClick={() => updateMaintenanceStatus(item.id, 'resolved')}
                     className="flex-1 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-xs font-bold transition-colors"
                   >
                     Çözüldü İşaretle
                   </button>
                )}
                {status === 'in_progress' && !canManage && (
                   <span className="flex-1 text-center py-2 text-xs font-bold text-stone-400">Onarımda</span>
                )}
                {status === 'resolved' && (
                  <div className="flex-1 text-center py-2 text-xs font-bold text-stone-400">
                    Çözüm: {formatTimeAgo(item.resolvedAt || item.createdAt)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Arıza ve Bakım"
        description="Lojmanlardaki arıza bildirimleri ve teknik servis takibi."
        actions={
          canManage && (
            <button 
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Yeni Arıza Kaydı
            </button>
          )
        }
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 shrink-0 overflow-y-auto">
          <div className="bg-white rounded-[32px] p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#7C8363]" /> 
              Yeni Arıza Bildirimi
            </h3>
            <form onSubmit={handleAddRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Lojman Binası</label>
                <select required value={newRequest.facilityId} onChange={e => { setNewRequest({...newRequest, facilityId: e.target.value, roomId: ''}); }} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                  <option value="">Seçiniz...</option>
                  {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Oda Numarası (Opsiyonel)</label>
                <select value={newRequest.roomId} onChange={e => setNewRequest({...newRequest, roomId: e.target.value})} disabled={!newRequest.facilityId} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363] disabled:opacity-50">
                  <option value="">Ortak Alan / Bina Geneli</option>
                  {facilityRoomsForForm.map(r => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Bildiren Kişi / Personel</label>
                <input required type="text" value={newRequest.reporterName} onChange={e => setNewRequest({...newRequest, reporterName: e.target.value})} placeholder="Örn: Ahmet Yılmaz" className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]" />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Arıza Açıklaması</label>
                <textarea required rows={4} value={newRequest.description} onChange={e => setNewRequest({...newRequest, description: e.target.value})} placeholder="Örn: 2. kat koridor tavanından su damlıyor..." className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363] resize-none" />
              </div>
              
              <div className="sm:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" className="px-5 py-2 bg-[#2D332D] text-white rounded-xl hover:bg-[#1A1C18] font-semibold text-sm">Talebi Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
        <KanbanColumn 
          title="Açık Talepler" 
          status="open" 
          items={openTickets} 
          icon={AlertCircle} 
          colorClass="text-orange-500" 
          borderClass="border-orange-500" 
        />
        <KanbanColumn 
          title="İşlemde" 
          status="in_progress" 
          items={inProgressTickets} 
          icon={Clock} 
          colorClass="text-blue-500" 
          borderClass="border-blue-500" 
        />
        <KanbanColumn 
          title="Çözüldü" 
          status="resolved" 
          items={resolvedTickets} 
          icon={CheckCircle2} 
          colorClass="text-green-500" 
          borderClass="border-green-500" 
        />
      </div>
    </div>
  );
}
