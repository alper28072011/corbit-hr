import React, { useState, useMemo, ReactNode, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, UserPlus, LogOut, ShieldAlert, MoreVertical, Edit2, Trash2, FileText, CheckCircle, Replace, FilterX, Clock, Info, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useStore } from "../store/useStore";
import { cn, calculateAge } from "../lib/utils";
import { PERMISSION_KEYS, hasPermission } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";
import CheckInWizard from "../components/staff/CheckInWizard";

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

  // Security check
  if (!hasPermission(currentUser?.role, PERMISSION_KEYS.view_staff_management, roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  // Form states
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const defaultHotelId = currentUser?.role === 'hotel_hr_manager' 
    ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
    : '';

  const [newStaff, setNewStaff] = useState({
    fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: defaultHotelId, gender: 'male' as const, notes: ''
  });

  // Placement modal state
  const [selectedStaffIdToPlace, setSelectedStaffIdToPlace] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Edit Modal State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: '', gender: 'male' as const, status: '', notes: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{ x: number, y: number, staffId: string } | null>(null);

  // Logs Modal State
  const [logsModalStaffId, setLogsModalStaffId] = useState<string | null>(null);

  // Global Search & Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchParams] = useSearchParams();

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'room', direction: 'asc' });

  // Handle URL query parameters and filter initialization
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    const pendingCount = staff.filter(s => s.status === 'pending_placement').length;

    if (filterParam === 'pending') {
      setFilterStatus('pending_placement');
    } else if (!filterParam || pendingCount === 0) {
      setFilterStatus('placed');
    }
  }, [searchParams, staff]);

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
  const canViewLogs = hasPermission(currentUser?.role, 'view_logs', roles);

  const availableHotels = useMemo(() => {
    if (!currentUser) return [];
    if (['super_admin', 'hr_director'].includes(currentUser.role)) return hotels;
    if (currentUser.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      return hotels.filter(h => hotelIds.includes(h.id));
    }
    return hotels;
  }, [hotels, currentUser]);

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

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)));

  const unifiedStaffData = useMemo(() => {
    return staff.map(s => {
      const h = hotels.find(x => x.id === s.hotelId);
      
      let acc = null;
      if (s.status === 'placed') {
        acc = accommodations.find(a => a.staffId === s.id && a.status === 'active');
      } else if (s.status === 'left') {
        acc = accommodations.filter(a => a.staffId === s.id && a.status === 'checked_out')
                          .sort((a,b) => new Date(b.checkOutDate || 0).getTime() - new Date(a.checkOutDate || 0).getTime())[0];
      }
      
      let f = null;
      let r = null;
      if (acc) {
        f = facilities.find(x => x.id === acc.facilityId);
        r = rooms.find(x => x.id === acc.roomId);
      }

      return { staff: s, hotel: h, acc, facility: f, room: r };
    }).filter(item => {
      // Logic from pre-unified arrays to restrict by role
      if (currentUser?.role === 'hotel_hr_manager') {
        const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
        if (item.staff.hotelId && !hotelIds.includes(item.staff.hotelId)) return false;
      }
      if (currentUser?.role === 'facility_manager') {
        if (item.staff.status !== 'pending_placement') {
          const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
          if (item.acc?.facilityId && !facIds.includes(item.acc.facilityId)) return false;
        }
      }

      // Global Search
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        const matchName = item.staff.fullName.toLowerCase().includes(term);
        const matchTc = item.staff.tcNo?.toLowerCase().includes(term);
        const matchPhone = item.staff.phone?.toLowerCase().includes(term);
        if (!matchName && !matchTc && !matchPhone) return false;
      }

      // UI Filters
      if (filterStatus && item.staff.status !== filterStatus) return false;
      if (filterHotel && item.staff.hotelId !== filterHotel) return false;
      if (filterFacility) {
        if (item.acc?.facilityId !== filterFacility) return false;
      }
      if (filterDepartment && item.staff.department !== filterDepartment) return false;

      return true;
    }).sort((a, b) => {
      // Dynamic Sort
      if (sortConfig) {
        let aValue: any = '';
        let bValue: any = '';
        
        switch (sortConfig.key) {
          case 'hotel':
            aValue = a.hotel?.name || '';
            bValue = b.hotel?.name || '';
            break;
          case 'department':
            aValue = `${a.staff.department || ''} ${a.staff.position || ''}`;
            bValue = `${b.staff.department || ''} ${b.staff.position || ''}`;
            break;
          case 'fullName':
            aValue = a.staff.fullName || '';
            bValue = b.staff.fullName || '';
            break;
          case 'facility':
            aValue = a.facility?.name || '';
            bValue = b.facility?.name || '';
            break;
          case 'room':
            aValue = a.room?.roomNumber || '';
            bValue = b.room?.roomNumber || '';
            break;
          case 'gender':
            aValue = a.staff.gender || '';
            bValue = b.staff.gender || '';
            break;
          case 'status':
            const statusLabels: Record<string, string> = {
              pending_placement: 'Bekliyor',
              placed: 'Konaklıyor',
              left: 'Çıkış Yaptı'
            };
            aValue = statusLabels[a.staff.status] || a.staff.status;
            bValue = statusLabels[b.staff.status] || b.staff.status;
            break;
        }

        if (sortConfig.key === 'room') {
          const cmp = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });
          return sortConfig.direction === 'asc' ? cmp : -cmp;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }

      // Base Sort: sort pending first, then placed, then left. Then by name
      const statusOrder = { pending_placement: 0, placed: 1, left: 2 };
      const aOrder = statusOrder[a.staff.status as keyof typeof statusOrder] ?? 3;
      const bOrder = statusOrder[b.staff.status as keyof typeof statusOrder] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      return a.staff.fullName.localeCompare(b.staff.fullName);
    });
  }, [staff, hotels, facilities, rooms, accommodations, currentUser, globalSearch, filterStatus, filterHotel, filterFacility, filterDepartment, sortConfig]);


  const handleAddStaff = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.hotelId || !canAddStaff) return;
    addStaff({ ...newStaff, status: 'pending_placement' });
    setShowAddStaffForm(false);
    
    const dHotelId = currentUser?.role === 'hotel_hr_manager' 
      ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
      : '';
    setNewStaff({ fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: dHotelId, gender: 'male', notes: '' });
  };

  const handlePlaceStaff = () => {
    if (!selectedStaffIdToPlace || !selectedFacilityId || !selectedRoomId) return;
    placeStaff(selectedStaffIdToPlace, selectedFacilityId, selectedRoomId);
    setSelectedStaffIdToPlace(null);
    setSelectedFacilityId('');
    setSelectedRoomId('');
  };

  const handleOpenEdit = (staffData: import('../types').Staff) => {
    setEditForm({
      fullName: staffData.fullName,
      tcNo: staffData.tcNo,
      phone: staffData.phone || '',
      birthDate: staffData.birthDate || '',
      department: staffData.department,
      position: staffData.position,
      hotelId: staffData.hotelId,
      gender: staffData.gender,
      status: staffData.status,
      notes: staffData.notes || ''
    });
    setEditingStaffId(staffData.id);
  };

  const handleSaveEdit = async (e: import('react').FormEvent) => {
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

  const staffToPlace = staff.find(s => s.id === selectedStaffIdToPlace);
  
  const availableRooms = useMemo(() => {
    if (!staffToPlace || !selectedFacilityId) return [];
    
    return rooms.filter(r => {
      if (r.facilityId !== selectedFacilityId) return false;
      if (r.status !== 'active') return false;
      if (r.genderType !== 'mixed' && r.genderType !== staffToPlace.gender) return false;
      
      const occupancy = accommodations.filter(a => a.roomId === r.id && a.status === 'active').length;
      return occupancy < r.bedCount;
    });
  }, [rooms, staffToPlace, selectedFacilityId, accommodations]);

  const clearFilters = () => {
    setGlobalSearch('');
    setFilterStatus('');
    setFilterHotel('');
    setFilterFacility('');
    setFilterDepartment('');
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-[#7C8363]" /> 
      : <ArrowDown className="w-3 h-3 ml-1 text-[#7C8363]" />;
  };

  const isSorted = (columnName: string) => {
    return sortConfig?.key === columnName;
  };

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="shrink-0">
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
      </div>

      {/* Toolbar */}
      <div className="card-standard p-4 flex flex-col md:flex-row gap-4 bg-[#FDFCFB] shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="İsim, TC No veya Telefon ile ara..." 
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] shadow-sm transition-all"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar items-center">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[140px]">
              <option value="">Tüm Durumlar</option>
              <option value="placed">Konaklıyor</option>
              <option value="pending_placement">Yerleşim Bekliyor</option>
              <option value="left">Çıkış Yaptı</option>
            </select>
            
            <select value={filterHotel} onChange={(e) => setFilterHotel(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[140px]">
              <option value="">Tüm Oteller</option>
              {availableHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[140px]">
              <option value="">Tüm Lojmanlar</option>
              {availableFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>

            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] bg-white shadow-sm font-medium text-stone-700 min-w-[140px]">
              <option value="">Tüm Departmanlar</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

             <button 
              onClick={clearFilters}
              className="p-2 text-stone-400 hover:text-stone-700 bg-white border border-[#E8E6E1] hover:bg-stone-50 rounded-xl transition-colors shrink-0 shadow-sm"
              title="Filtreleri Temizle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

      <div className="card-standard flex flex-col bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left relative">
              <thead className="bg-[#FDFCFB] sticky top-0 z-10 shadow-sm border-b border-[#E8E6E1]">
                <tr>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('hotel') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('hotel')}>
                    <div className="flex items-center">Otel Adı {getSortIcon('hotel')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('department') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('department')}>
                    <div className="flex items-center">Departman & Görev {getSortIcon('department')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('fullName') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('fullName')}>
                    <div className="flex items-center">Personel Adı {getSortIcon('fullName')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('facility') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('facility')}>
                    <div className="flex items-center">Lojman {getSortIcon('facility')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('room') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('room')}>
                    <div className="flex items-center">Oda {getSortIcon('room')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('gender') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('gender')}>
                    <div className="flex items-center">Cinsiyet {getSortIcon('gender')}</div>
                  </th>
                  <th className={cn("px-6 py-4 text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-stone-50 select-none", isSorted('status') ? 'text-[#7C8363]' : 'text-stone-500')} onClick={() => requestSort('status')}>
                    <div className="flex items-center">Durum {getSortIcon('status')}</div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-stone-500 uppercase tracking-wider text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1] bg-white">
                {unifiedStaffData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-stone-500">
                      Seçilen kriterlere uygun personel bulunamadı.
                    </td>
                  </tr>
                ) : (
                  unifiedStaffData.map(({ staff: s, hotel: h, acc, facility: f, room: r }) => (
                    <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-stone-700">
                        {h?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-stone-600">
                        <p className="font-medium text-stone-800">{s.department || '-'}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{s.position || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#2D332D]">{s.fullName}</p>
                          {/* Tooltip info icon */}
                          <div 
                            className="relative flex items-center justify-center"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipData({ x: rect.left + rect.width / 2, y: rect.top, staffId: s.id });
                            }}
                            onMouseLeave={() => setTooltipData(null)}
                          >
                            <Info className="w-4 h-4 text-stone-400 hover:text-[#7C8363] cursor-help" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#7C8363]">
                        {s.status === 'pending_placement' ? (
                          <span className="text-stone-400 italic font-normal">-</span>
                        ) : (
                          f?.name || 'Bilinmeyen Lojman'
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-medium text-stone-600">
                        {s.status === 'pending_placement' ? (
                          <span className="text-stone-400 italic font-sans font-normal">-</span>
                        ) : (
                          r?.roomNumber || '-'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", s.gender === 'female' ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-blue-700")}>
                          {s.gender === 'female' ? 'Kadın' : 'Erkek'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col items-start gap-1">
                          {s.status === 'placed' && (
                             <>
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                                 Konaklıyor
                               </span>
                               <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                                 G: {acc?.checkInDate ? new Date(acc.checkInDate).toLocaleDateString('tr-TR') : '-'}
                               </span>
                             </>
                          )}
                          {s.status === 'pending_placement' && (
                             <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
                               Bekliyor
                             </span>
                          )}
                          {s.status === 'left' && (
                             <>
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                                 Çıkış Yaptı
                               </span>
                               <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                                 Ç: {acc?.checkOutDate ? new Date(acc.checkOutDate).toLocaleDateString('tr-TR') : '-'}
                               </span>
                             </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {(canPlaceStaff || canCheckoutStaff || canEditStaff || canDeleteStaff || canViewDoc) ? (
                          <ActionMenu>
                            {s.status === 'pending_placement' && canPlaceStaff && (
                              <button 
                                onClick={() => setSelectedStaffIdToPlace(s.id)}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4 text-[#7C8363]" /> Yerleştir
                              </button>
                            )}
                            {s.status === 'placed' && canCheckoutStaff && acc && (
                              <button 
                                onClick={() => {
                                  if(confirm(`${s.fullName} isimli personelin lojmandan çıkışını yapmak istediğinize emin misiniz?`)) {
                                    checkoutStaff(acc.id, new Date().toISOString().split('T')[0]);
                                  }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <LogOut className="w-4 h-4" /> Çıkış Yap
                              </button>
                            )}
                            {s.status === 'placed' && canChangeRoom && (
                               <button 
                                 onClick={() => alert("Oda değiştirme ekranı geliştirme aşamasındadır.")}
                                 className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                               >
                                 <Replace className="w-4 h-4" /> Oda Değiştir
                               </button>
                            )}
                            {s.status === 'left' && canPlaceStaff && acc && (
                               <button 
                                 onClick={() => {
                                   if(confirm(`${s.fullName} isimli personelin lojmana geri dönüşünü (C/OUT İptali) onaylıyor musunuz?`)) {
                                     undoCheckoutStaff(acc.id);
                                   }
                                 }}
                                 className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                               >
                                 <CheckCircle className="w-4 h-4" /> Çıkış İptali (Geri Al)
                               </button>
                            )}
                            
                            {canViewLogs && (
                              <button 
                                onClick={() => setLogsModalStaffId(s.id)}
                                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                              >
                                <Clock className="w-4 h-4" /> İşlem Geçmişi
                              </button>
                            )}
                            {canEditStaff && (
                              <button 
                                onClick={() => handleOpenEdit(s)}
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
                                onClick={() => { if(confirm(`${s.fullName} isimli personelin kaydını tamamen silmek istediğinize emin misiniz?`)) deleteStaff(s.id); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 pt-1"
                              >
                                <Trash2 className="w-4 h-4" /> Kaydı Sil
                              </button>
                            )}
                          </ActionMenu>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>

      {showAddStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6 text-[#2D332D]">Yeni Personel Kaydı</h3>
            <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad *</label>
                <input required type="text" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Personel ad ve soyadı" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Doğum Tarihi</label>
                <input type="date" value={newStaff.birthDate} onChange={e => setNewStaff({...newStaff, birthDate: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport *</label>
                <input required type="text" value={newStaff.tcNo} onChange={e => setNewStaff({...newStaff, tcNo: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="TC veya Pasaport No" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Telefon</label>
                <input type="text" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Başında sıfır olmadan..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Çalıştığı Otel *</label>
                <select 
                  required 
                  value={newStaff.hotelId} 
                  onChange={e => setNewStaff({...newStaff, hotelId: e.target.value})} 
                  className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] disabled:opacity-50"
                  disabled={currentUser?.role === 'hotel_hr_manager'}
                >
                  <option value="">Seçiniz...</option>
                  {availableHotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Cinsiyet *</label>
                <select value={newStaff.gender} onChange={e => setNewStaff({...newStaff, gender: e.target.value as 'male'|'female'})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]">
                  <option value="male">Erkek</option>
                  <option value="female">Kadın</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Departman</label>
                <input type="text" value={newStaff.department} onChange={e => setNewStaff({...newStaff, department: e.target.value})} placeholder="Örn: Mutfak" className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                <input type="text" value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} placeholder="Örn: Aşçı" className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Notlar / Açıklama</label>
                <textarea value={newStaff.notes} onChange={e => setNewStaff({...newStaff, notes: e.target.value})} placeholder="Personel ile ilgili notlar..." className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] min-h-[80px]" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowAddStaffForm(false)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4"/> Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStaffIdToPlace && staffToPlace && (
        <CheckInWizard staffMember={staffToPlace} onClose={() => setSelectedStaffIdToPlace(null)} />
      )}

      {/* Edit Staff Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
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
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport *</label>
                <input required type="text" value={editForm.tcNo} onChange={e => setEditForm({...editForm, tcNo: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
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
                  disabled={currentUser?.role === 'hotel_hr_manager'}
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
                <input type="text" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                <input type="text" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Notlar / Açıklama</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Personel ile ilgili notlar..." className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] min-h-[80px]" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingStaffId(null)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" disabled={isSavingEdit} className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2">
                  {isSavingEdit ? 'Kaydediliyor...' : <><Edit2 className="w-4 h-4"/> Kaydet</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Logs Modal */}
      {logsModalStaffId && (
        <StaffLogsModal staffId={logsModalStaffId} onClose={() => setLogsModalStaffId(null)} />
      )}

      {/* Global Tooltip */}
      {tooltipData && (() => {
        const s = staff.find(st => st.id === tooltipData.staffId);
        if (!s) return null;
        return (
          <div 
            className="fixed flex flex-col bg-gray-800 text-white text-xs rounded-lg px-3 py-3 z-[9999] shadow-xl items-center pointer-events-none before:content-[''] before:absolute before:top-full before:left-1/2 before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-800 transform -translate-x-1/2 -translate-y-full origin-bottom"
            style={{ 
              left: tooltipData.x, 
              top: tooltipData.y - 8 // 8px offset above the icon
            }}
          >
            <span className="font-semibold block mb-1">TC Kimlik No: {s.tcNo || '-'}</span>
            <span className="block text-gray-200 mb-1">Telefon: {s.phone || '-'}</span>
            {s.birthDate ? (
              <span className="block text-gray-200 border-t border-gray-600 mt-1 pt-1">
                Doğum Tarihi: {new Date(s.birthDate).toLocaleDateString('tr-TR')} (Yaş: {calculateAge(s.birthDate)})
              </span>
            ) : (
              <span className="block text-gray-400 italic border-t border-gray-600 mt-1 pt-1">Doğum Tarihi Belirtilmemiş</span>
            )}
            {s.notes && (
              <span className="block text-gray-200 border-t border-gray-600 mt-2 pt-2 max-w-[200px] whitespace-normal break-words text-left self-start w-full">
                <strong className="text-gray-400 block mb-0.5">Not:</strong>{s.notes}
              </span>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function StaffLogsModal({ staffId, onClose }: { staffId: string, onClose: () => void }) {
  const allLogs = useStore(s => s.logs);
  const staffLogs = useMemo(() => {
    return allLogs.filter(l => l.entityId === staffId).sort((a,b) => b.timestamp - a.timestamp);
  }, [allLogs, staffId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative">
        <div className="flex justify-between items-start shrink-0 mb-4 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-xl font-bold text-[#2D332D] flex items-center gap-2">
              <Clock className="w-5 h-5 text-stone-400" /> İşlem Geçmişi
            </h3>
            <p className="text-sm text-stone-500 mt-1">Personel üzerinde yapılan işlemler ve değişiklikler</p>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 bg-stone-50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          {staffLogs.length === 0 ? (
            <div className="py-12 flex items-center justify-center text-stone-500 text-sm">
              Bu personel için henüz bir işlem kaydı bulunmuyor.
            </div>
          ) : (
            <div className="relative border-l-2 border-stone-100 ml-3 py-6 space-y-8">
              {staffLogs.map((log) => {
                 let icon = <Edit2 className="w-4 h-4 text-[#7C8363]" />;
                 if (log.action === 'create') icon = <UserPlus className="w-4 h-4 text-emerald-600" />;
                 if (log.action === 'delete') icon = <Trash2 className="w-4 h-4 text-red-500" />;
                 if (log.action === 'check_in') icon = <CheckCircle className="w-4 h-4 text-emerald-600" />;
                 if (log.action === 'check_out') icon = <LogOut className="w-4 h-4 text-orange-500" />;
                 if (log.action === 'room_change') icon = <Replace className="w-4 h-4 text-blue-500" />;

                 return (
                  <div key={log.id} className="relative pl-6">
                    <span className="absolute -left-6 top-1 w-6 overflow-hidden">
                       <div className="w-2.5 h-2.5 bg-white border-2 border-stone-300 rounded-full ml-1.5 mt-0.5"></div>
                    </span>
                    <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 shadow-sm relative">
                       <span className="absolute -left-[35px] top-4 w-6 h-6 bg-white border border-stone-100 shadow-sm rounded-full flex items-center justify-center">
                         {icon}
                       </span>
                       <div className="flex justify-between items-start gap-4 mb-2">
                         <span className="text-xs font-bold font-mono text-stone-500 uppercase tracking-widest bg-stone-100 px-2 py-1 rounded">
                           {new Date(log.timestamp).toLocaleString('tr-TR')}
                         </span>
                         <span className="text-xs text-stone-500 font-medium whitespace-nowrap bg-white border border-stone-200 px-2 py-0.5 rounded-full shadow-sm">
                           {log.performedBy || 'Sistem'}
                         </span>
                       </div>
                       <p className="text-sm text-[#2D332D] leading-relaxed">
                         {log.changes}
                       </p>
                    </div>
                  </div>
                 );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
