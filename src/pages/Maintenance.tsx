import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Plus, Wrench, Search, Filter, Trash2, Edit2, History, AlertCircle, MapPin, 
  X, Check, ChevronDown, ListFilter, AlignLeft, ShieldAlert, CheckCircle
} from "lucide-react";
import { useStore } from "../store/useStore";
import { cn, naturalSort } from "../lib/utils";
import { MaintenanceTicket, ActionLog } from "../types";
import { PAGE_KEYS, canViewPage, can } from "../lib/permissions";
import { usePageRefresh } from "../hooks/usePageRefresh";
import { PageHeader } from "../components/layout/PageHeader";
import { motion, AnimatePresence } from "motion/react";

function formatTimeDiff(startTime: number, endTime: number = Date.now()) {
  const diffInSeconds = Math.floor((endTime - startTime) / 1000);
  
  if (diffInSeconds < 60) return "1 dakikadan az";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} d`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} s ${diffInMinutes % 60} d`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} g ${diffInHours % 24} s`;
}

function formatDateLabel(timestamp: number) {
  return new Date(timestamp).toLocaleString('tr-TR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export default function Maintenance() {
  const hotels = useStore(state => state.hotels);
  const facilities = useStore(state => state.facilities);
  const rooms = useStore(state => state.rooms);
  const maintenanceTickets = useStore(state => state.maintenanceTickets);
  const addRoom = useStore(state => state.addRoom);
  const addMaintenanceTicket = useStore(state => state.addMaintenanceTicket);
  const updateMaintenanceTicket = useStore(state => state.updateMaintenanceTicket);
  const deleteMaintenanceTicket = useStore(state => state.deleteMaintenanceTicket);
  const addLog = useStore(state => state.addLog);
  const logs = useStore(state => state.logs);
  const currentUser = useStore(state => state.currentUser);
  
  const rp = useStore.getState().rolesPermissions;
  const canCreate = can(currentUser?.role, 'create_ticket', PAGE_KEYS.maintenance, rp);
  const canEdit = can(currentUser?.role, 'edit_ticket', PAGE_KEYS.maintenance, rp);
  const canDelete = can(currentUser?.role, 'delete_ticket', PAGE_KEYS.maintenance, rp);
  const canUpdateStatus = can(currentUser?.role, 'update_ticket_status', PAGE_KEYS.maintenance, rp);
  const canViewLogs = can(currentUser?.role, 'view_logs', 'settings', rp);

  // Read preferences
  const uiPrefs = useStore(state => state.uiPreferences);
  const setUiPreference = useStore(state => state.setUiPreference);
  const pageKey = PAGE_KEYS.maintenance;

  const mFilters = uiPrefs.lastFilters[pageKey] || {};
  const searchQuery = mFilters.search ?? '';
  const filterStatus = mFilters.status ?? 'all';
  const filterPriority = mFilters.priority ?? 'all';
  const filterFacility = mFilters.facilityId ?? 'all';
  const filterHotel = mFilters.hotelId ?? 'all';

  const setSearchQuery = (val: string) => setUiPreference('lastFilters', pageKey, { ...mFilters, search: val });
  const setFilterStatus = (val: string) => setUiPreference('lastFilters', pageKey, { ...mFilters, status: val });
  const setFilterPriority = (val: string) => setUiPreference('lastFilters', pageKey, { ...mFilters, priority: val });
  const setFilterFacility = (val: string) => setUiPreference('lastFilters', pageKey, { ...mFilters, facilityId: val });
  const setFilterHotel = (val: string) => setUiPreference('lastFilters', pageKey, { ...mFilters, hotelId: val });

  const refreshAction = usePageRefresh();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
  
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTicketForStatus, setSelectedTicketForStatus] = useState<MaintenanceTicket | null>(null);
  const [statusUpdateForm, setStatusUpdateForm] = useState({
    status: '',
    description: ''
  });

  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedTicketForLog, setSelectedTicketForLog] = useState<MaintenanceTicket | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    hotelId: '',
    dormId: '',
    roomId: '',
    priority: 'Düşük' as "Düşük" | "Orta" | "Acil",
    reportedBy: currentUser?.fullName || '',
  });

  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredFacilityRooms = useMemo(() => {
    if (!formData.dormId) return [];
    
    // Filtrelenmiş listeyi naturalSort ile sıralayıp dönüyoruz
    return naturalSort(rooms.filter(r => r.facilityId === formData.dormId), r => r.roomNumber);
  }, [rooms, formData.dormId]);

  const searchedRooms = useMemo(() => {
    if (!roomSearchQuery) return filteredFacilityRooms;
    const lowerQuery = roomSearchQuery.toLowerCase();
    return filteredFacilityRooms.filter(r => r.roomNumber.toLowerCase().includes(lowerQuery));
  }, [filteredFacilityRooms, roomSearchQuery]);

  const exactRoomMatch = filteredFacilityRooms.find(r => r.roomNumber.toLowerCase() === roomSearchQuery.trim().toLowerCase());
  const [pendingRoomSelect, setPendingRoomSelect] = useState<string | null>(null);

  useEffect(() => {
    if (pendingRoomSelect) {
      const newlyAdded = rooms.find(r => r.facilityId === formData.dormId && r.roomNumber.toLowerCase() === pendingRoomSelect.toLowerCase());
      if (newlyAdded) {
        setFormData(prev => ({ ...prev, roomId: newlyAdded.id }));
        setPendingRoomSelect(null);
        setIsRoomDropdownOpen(false);
      }
    }
  }, [rooms, pendingRoomSelect, formData.dormId]);

  const handleRoomCreateAndSelect = async () => {
    if (!roomSearchQuery.trim() || exactRoomMatch || !formData.dormId) return;
    
    const newRoomName = roomSearchQuery.trim();
    try {
      setPendingRoomSelect(newRoomName);
      const newRoom = {
        facilityId: formData.dormId,
        roomNumber: newRoomName,
        block: 'Özel Konum',
        bedCount: 0,
        genderType: 'mixed' as const,
        status: 'active' as const,
        notes: 'Sistem tarafından otomatik oluşturulan özel konum',
      };
      await addRoom(newRoom);
      setRoomSearchQuery('');
    } catch (error) {
      console.error(error);
      setPendingRoomSelect(null);
    }
  };

  // Display selected room name
  const selectedRoomForForm = rooms.find(r => r.id === formData.roomId);

  // Filter Data
  const visibleTickets = useMemo(() => {
    let results = maintenanceTickets;

    if (currentUser?.role === 'facility_manager') {
      const allowedFacIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      results = results.filter(t => allowedFacIds.includes(t.dormId));
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.id.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') results = results.filter(t => t.status === filterStatus);
    if (filterPriority !== 'all') results = results.filter(t => t.priority === filterPriority);
    if (filterFacility !== 'all') results = results.filter(t => t.dormId === filterFacility);
    if (filterHotel !== 'all') results = results.filter(t => t.hotelId === filterHotel);

    // Sort: Open items first, then by priority, then newest
    return results.sort((a, b) => {
      if (a.status !== b.status) {
         if (a.status === 'İşlemde') return -1;
         if (a.status === 'Açık') return -1;
         return 1;
      }
      const pmap = { 'Acil': 3, 'Orta': 2, 'Düşük': 1 };
      if (pmap[a.priority] !== pmap[b.priority]) return pmap[b.priority] - pmap[a.priority];
      return b.createdAt - a.createdAt;
    });
  }, [maintenanceTickets, currentUser, searchQuery, filterStatus, filterPriority, filterFacility, filterHotel]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dormId) return;

    if (editingTicket) {
      await updateMaintenanceTicket(editingTicket.id, {
        title: formData.title,
        description: formData.description,
        hotelId: formData.hotelId,
        dormId: formData.dormId,
        roomId: formData.roomId || undefined,
        priority: formData.priority,
      });
      await addLog({
        entityId: editingTicket.id,
        entityType: 'maintenance',
        action: 'update',
        changes: `Kayıt detayları güncellendi.`,
        performedBy: currentUser?.fullName || 'Unknown',
        timestamp: Date.now()
      });
    } else {
      await addMaintenanceTicket({
        title: formData.title,
        description: formData.description,
        hotelId: formData.hotelId,
        dormId: formData.dormId,
        roomId: formData.roomId || undefined,
        reportedBy: formData.reportedBy,
        priority: formData.priority,
      });
    }

    if (!editingTicket) {
      setSearchQuery('');
      setFilterStatus('Açık');
      setFilterFacility('all');
      setFilterHotel('all');
      setFilterPriority('all');
    }

    setShowAddModal(false);
    setEditingTicket(null);
    setSuccessMessage(editingTicket ? 'Arıza kaydı başarıyla güncellendi.' : 'Yeni arıza kaydı başarıyla eklendi.');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketForStatus || !statusUpdateForm.status) return;

    await updateMaintenanceTicket(selectedTicketForStatus.id, {
      status: statusUpdateForm.status as any
    });
    
    await addLog({
      entityId: selectedTicketForStatus.id,
      entityType: 'maintenance',
      action: 'update',
      changes: `Durum değişti: ${statusUpdateForm.status}. Açıklama: ${statusUpdateForm.description || '-'}`,
      performedBy: currentUser?.fullName || 'Unknown',
      timestamp: Date.now()
    });

    setShowStatusModal(false);
    setSelectedTicketForStatus(null);
  };

  const openAddModal = (ticket?: MaintenanceTicket) => {
    if (ticket) {
      setEditingTicket(ticket);
      setFormData({
        title: ticket.title,
        description: ticket.description,
        hotelId: ticket.hotelId,
        dormId: ticket.dormId,
        roomId: ticket.roomId || '',
        priority: ticket.priority,
        reportedBy: ticket.reportedBy,
      });
    } else {
      setEditingTicket(null);
      setFormData({
        title: '',
        description: '',
        hotelId: '',
        dormId: '',
        roomId: '',
        priority: 'Düşük',
        reportedBy: currentUser?.fullName || '',
      });
    }
    setShowAddModal(true);
  };

  const openStatusModal = (ticket: MaintenanceTicket) => {
    setSelectedTicketForStatus(ticket);
    setStatusUpdateForm({
      status: ticket.status,
      description: ''
    });
    setShowStatusModal(true);
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      'Açık': 'bg-red-50 text-red-700 border-red-200',
      'İşlemde': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Kapalı': 'bg-green-50 text-green-700 border-green-200',
      'İptal Edildi': 'bg-stone-50 text-stone-600 border-stone-200',
    };
    return <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", colors[status] || colors['Açık'])}>{status}</span>;
  };

  const PriorityBadge = ({ priority }: { priority: string }) => {
    const colors: Record<string, string> = {
      'Acil': 'bg-red-500 text-white',
      'Orta': 'bg-orange-500 text-white',
      'Düşük': 'bg-[#7C8363] text-white',
    };
    return <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold", colors[priority] || colors['Düşük'])}>{priority}</span>;
  };

  if (!canViewPage(currentUser?.role, PAGE_KEYS.maintenance, useStore.getState().rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-6 space-y-6">
      <PageHeader
        title="Arıza ve Bakım Yönetimi"
        description="Tesislerdeki teknik talepleri ve arızaları merkezi olarak takip edin."
        actions={[
          refreshAction,
          ...(canCreate ? [{
            key: 'new_ticket',
            icon: Plus,
            tooltip: 'Yeni Arıza Kaydı',
            onClick: () => openAddModal(),
            permissionKey: 'create_ticket'
          }] : [])
        ]}
      />

      {successMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      <div className="card-standard p-4">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                type="text" 
                placeholder="Başlık veya ID ile ara..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C8363]/20 transition-all font-medium"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex items-center bg-stone-50 rounded-xl px-3 py-2">
                <ListFilter className="w-4 h-4 text-stone-400 mr-2" />
                <select 
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-stone-600 focus:outline-none appearance-none pr-6 cursor-pointer"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="Açık">Açık</option>
                  <option value="İşlemde">İşlemde</option>
                  <option value="Kapalı">Kapalı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                </select>
                <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 pointer-events-none" />
              </div>

              <div className="relative flex items-center bg-stone-50 rounded-xl px-3 py-2">
                <select 
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-stone-600 focus:outline-none appearance-none pr-6 cursor-pointer"
                >
                  <option value="all">Tüm Öncelikler</option>
                  <option value="Düşük">Düşük</option>
                  <option value="Orta">Orta</option>
                  <option value="Acil">Acil</option>
                </select>
                <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 pointer-events-none" />
              </div>

              <div className="relative flex items-center bg-stone-50 rounded-xl px-3 py-2">
                <MapPin className="w-4 h-4 text-stone-400 mr-2" />
                <select 
                  value={filterFacility}
                  onChange={e => setFilterFacility(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-stone-600 focus:outline-none appearance-none pr-6 cursor-pointer max-w-[150px] truncate"
                >
                  <option value="all">Tüm Lojmanlar</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 pointer-events-none" />
              </div>
            </div>
        </div>
      </div>

      <div className="card-standard overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#FDFCFB] border-b border-[#E8E6E1]">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Arıza Özeti</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Öncelik</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Lojman / Konum</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Bildiren</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Açılış</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider">Süre</th>
                <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E6E1]">
              {visibleTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-stone-500">
                    Kriterlere uygun arıza kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                visibleTickets.map(ticket => {
                  const facilityName = facilities.find(f => f.id === ticket.dormId)?.name || 'Bilinmeyen Lojman';
                  const roomName = rooms.find(r => r.id === ticket.roomId)?.roomNumber;
                  const isClosed = ticket.status === 'Kapalı' || ticket.status === 'İptal Edildi';
                  
                  return (
                    <tr key={ticket.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-4 w-[140px]">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#2D332D] text-sm line-clamp-1">{ticket.title}</div>
                        <div className="text-xs text-stone-500 font-mono mt-1 w-20 truncate">{ticket.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-stone-700">{facilityName}</div>
                        <div className="text-xs text-stone-500 mt-1">{roomName ? `Oda: ${roomName}` : 'Ortak Alan'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-stone-600">{ticket.reportedBy}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-stone-600 font-mono">{formatDateLabel(ticket.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        {isClosed ? (
                          <div className="text-xs font-medium text-stone-500">
                            Çözüm: {formatTimeDiff(ticket.createdAt, ticket.resolvedAt)}
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-orange-600 hover:text-orange-700" title="Açık kaldığı süre">
                            {formatTimeDiff(ticket.createdAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canUpdateStatus && !isClosed && (
                            <button 
                              onClick={() => openStatusModal(ticket)}
                              className="p-1.5 text-stone-500 hover:text-[#7C8363] hover:bg-[#7C8363]/10 rounded-lg transition-colors"
                              title="Durum Güncelle"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          {canEdit && (
                            <button 
                              onClick={() => openAddModal(ticket)}
                              className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canViewLogs && (
                            <button 
                              onClick={() => { setSelectedTicketForLog(ticket); setShowLogModal(true); }}
                              className="p-1.5 text-stone-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Geçmiş Logs"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button 
                              onClick={async () => {
                                if (confirm('Silmek istediğinize emin misiniz?')) {
                                  await deleteMaintenanceTicket(ticket.id);
                                }
                              }}
                              className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2D332D]">
                {editingTicket ? 'Arıza Kaydını Düzenle' : 'Yeni Arıza Kaydı'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Arıza Başlığı / Özeti</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]" placeholder="Örn: Banyo tavanı akıyor" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Detaylı Açıklama</label>
                <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363] resize-none" placeholder="..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Lojman / Tesis</label>
                  <select required value={formData.dormId} onChange={e => setFormData({...formData, dormId: e.target.value, roomId: ''})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                    <option value="">Seçiniz...</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="relative" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Konum / Oda Numarası</label>
                  <button 
                    type="button" 
                    disabled={!formData.dormId}
                    onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                    className="w-full px-3 py-2 border rounded-lg text-left bg-white focus:outline-none focus:border-[#7C8363] disabled:bg-stone-50 disabled:text-stone-400 flex items-center justify-between"
                  >
                    <span className="truncate whitespace-nowrap overflow-hidden text-ellipsis">
                      {selectedRoomForForm ? selectedRoomForForm.roomNumber : (formData.roomId ? "Özel Konum" : "Seçiniz Veya Yazınız...")}
                    </span>
                    <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                  </button>
                  
                  <AnimatePresence>
                    {isRoomDropdownOpen && formData.dormId && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden"
                      >
                        <div className="p-2 border-b shrink-0 flex items-center gap-2">
                          <Search className="w-4 h-4 text-stone-400 shrink-0" />
                          <input 
                            type="text" 
                            placeholder="Oda ara veya yeni konum yaz..." 
                            value={roomSearchQuery}
                            onChange={e => setRoomSearchQuery(e.target.value)}
                            className="w-full text-sm outline-none"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto p-1 text-sm">
                          <button 
                              type="button"
                              onClick={() => { setFormData({ ...formData, roomId: '' }); setIsRoomDropdownOpen(false); setRoomSearchQuery(''); }}
                              className={cn("w-full text-left px-3 py-2 rounded-md hover:bg-stone-50 transition-colors", !formData.roomId && "bg-stone-100 font-medium")}
                            >
                              Ortak Alan
                          </button>
                          {searchedRooms.map(r => (
                            <button 
                              key={r.id} 
                              type="button"
                              onClick={() => { setFormData({ ...formData, roomId: r.id }); setIsRoomDropdownOpen(false); setRoomSearchQuery(''); }}
                              className={cn("w-full text-left flex items-center gap-2 px-3 py-2 rounded-md hover:bg-stone-50 transition-colors", formData.roomId === r.id && "bg-[#7C8363]/10 text-[#7C8363] font-medium")}
                            >
                              {r.roomNumber}
                              {r.block === 'Özel Konum' && <span className="text-[10px] bg-stone-100 border text-stone-500 px-1.5 py-0.5 rounded leading-none">Özel Konum</span>}
                            </button>
                          ))}
                          {roomSearchQuery.trim() && !exactRoomMatch && (
                            <button
                              type="button"
                              disabled={!!pendingRoomSelect}
                              onClick={handleRoomCreateAndSelect}
                              className="w-full text-left px-3 py-2 rounded-md bg-[#7C8363]/5 hover:bg-[#7C8363]/10 text-[#7C8363] flex items-center justify-between font-medium border border-dashed border-[#7C8363]/30 mt-1"
                            >
                              <span className="flex items-center gap-2">
                                <Plus className="w-3 h-3" />
                                "{roomSearchQuery}" Konumu Ekle
                              </span>
                              {pendingRoomSelect && <div className="w-3 h-3 border-2 border-[#7C8363]/20 border-t-[#7C8363] rounded-full animate-spin" />}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Öncelik</label>
                  <select required value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                    <option value="Düşük">Düşük</option>
                    <option value="Orta">Orta</option>
                    <option value="Acil">Acil</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 mb-1">Bildiren Kişi</label>
                  <input required type="text" value={formData.reportedBy} onChange={e => setFormData({...formData, reportedBy: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]" />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-xl text-stone-600 font-semibold hover:bg-stone-50">İptal</button>
                <button type="submit" className="px-4 py-2 bg-[#2D332D] text-white rounded-xl font-semibold hover:bg-black">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusModal && selectedTicketForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-[#2D332D]">Durum Güncelle</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Yeni Durum</label>
                <select required value={statusUpdateForm.status} onChange={e => setStatusUpdateForm({...statusUpdateForm, status: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363]">
                  <option value="Açık">Açık</option>
                  <option value="İşlemde">İşlemde</option>
                  <option value="Kapalı">Kapalı</option>
                  <option value="İptal Edildi">İptal Edildi</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">İşlem Açıklaması</label>
                <textarea required rows={3} value={statusUpdateForm.description} onChange={e => setStatusUpdateForm({...statusUpdateForm, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-[#7C8363] resize-none" placeholder="Yapılan işlemi veya notları buraya girin..." />
              </div>
              
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 border rounded-xl text-stone-600 font-semibold hover:bg-stone-50">İptal</button>
                <button type="submit" className="px-4 py-2 bg-[#7C8363] text-white rounded-xl font-semibold hover:bg-[#6A7152]">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogModal && selectedTicketForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2D332D] flex items-center gap-2">
                <History className="w-5 h-5 text-stone-400" />
                İşlem Geçmişi
              </h2>
              <button onClick={() => setShowLogModal(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-6">
              {logs.filter(l => l.entityId === selectedTicketForLog.id).sort((a,b) => b.timestamp - a.timestamp).length === 0 ? (
                <div className="text-center text-sm text-stone-500 py-8">Kayıtlı işlem bulunamadı.</div>
              ) : (
                <div className="relative border-l border-stone-200 ml-3 space-y-6">
                  {logs.filter(l => l.entityId === selectedTicketForLog.id).sort((a,b) => b.timestamp - a.timestamp).map((log, i) => (
                    <div key={log.id} className="relative pl-6">
                      <div className="absolute w-3 h-3 bg-white border-2 border-stone-300 rounded-full -left-[1.5px] top-1"></div>
                      <div className="text-xs font-semibold text-stone-400 mb-1">{formatDateLabel(log.timestamp)}</div>
                      <div className="text-sm font-medium text-stone-800 bg-stone-50 p-3 rounded-xl border border-stone-100">
                        {log.changes}
                        <div className="text-xs text-stone-500 mt-2 flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#7C8363]"/> İşlemi Yapan: {log.performedBy}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
