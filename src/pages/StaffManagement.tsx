import React, { useState, useMemo, ReactNode, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, UserPlus, LogOut, ShieldAlert, MoreVertical, Edit2, Trash2, FileText, CheckCircle, Replace, FilterX, Clock, Info, ArrowUpDown, ArrowUp, ArrowDown, FileArchive, Download, UploadCloud, List, LayoutGrid } from "lucide-react";
import * as XLSX from "xlsx";
import { useStore } from "../store/useStore";
import { Staff } from "../types";
import { cn, calculateAge } from "../lib/utils";
import { PAGE_KEYS, canViewPage, can } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";
import CheckInWizard from "../components/staff/CheckInWizard";
import RoomChangeWizard from "../components/staff/RoomChangeWizard";
import { motion, AnimatePresence } from "motion/react";

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
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}></div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed w-56 rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.1)] bg-white border border-stone-100 z-[70] py-1 overflow-hidden" 
              style={{ top: position.top, right: position.right }}
              onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function StaffManagement() {
  const { hotels, facilities, rooms, staff, accommodations, addStaff, bulkAddStaffWithPlacements, placeStaff, checkoutStaff, undoCheckoutStaff, deleteStaff, bulkDeleteStaff, notifyCheckoutStaff, currentUser, roles } = useStore();

  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Form states
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [addStaffTab, setAddStaffTab] = useState<'single' | 'bulk'>('single');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importLog, setImportLog] = useState<{message: string, success: boolean} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultHotelId = currentUser?.role === 'hotel_hr_manager' 
    ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
    : '';

  const [newStaff, setNewStaff] = useState({
    fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: defaultHotelId, gender: 'male' as const, notes: '', specialNote: ''
  });

  // Placement modal state
  const [selectedStaffIdToPlace, setSelectedStaffIdToPlace] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

  // Edit Modal State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: '', gender: 'male' as const, status: '', notes: '', specialNote: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Tooltip state
  const [tooltipData, setTooltipData] = useState<{ x: number, y: number, staffId: string } | null>(null);

  // Logs Modal State
  const [logsModalStaffId, setLogsModalStaffId] = useState<string | null>(null);

  // Room Change Wizard state
  const [changingRoomStaffInfo, setChangingRoomStaffInfo] = useState<{ staff: Staff, currentRoomId: string, currentFacilityId: string } | null>(null);

  // Global Search & Filters
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterHotel, setFilterHotel] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
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

  const rp = useStore.getState().rolesPermissions;
  const canAddStaff = can(currentUser?.role, 'create_staff', PAGE_KEYS.staff, rp);
  const canPlaceStaff = can(currentUser?.role, 'change_room', PAGE_KEYS.staff, rp);
  const canCheckoutStaff = can(currentUser?.role, 'change_room', PAGE_KEYS.staff, rp);
  const canEditStaff = can(currentUser?.role, 'edit_staff', PAGE_KEYS.staff, rp);
  const canDeleteStaff = can(currentUser?.role, 'delete_staff', PAGE_KEYS.staff, rp);
  const canChangeRoom = can(currentUser?.role, 'change_room', PAGE_KEYS.staff, rp);
  const canViewDoc = can(currentUser?.role, 'view_sensitive_info', PAGE_KEYS.staff, rp);
  const canViewLogs = can(currentUser?.role, 'view_logs', 'settings', rp);

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

  const departments = Array.from(new Set(staff.map(s => s.department).filter(Boolean)))
    .filter((d): d is string => typeof d === 'string')
    .sort((a, b) => a.localeCompare(b, 'tr-TR'));

  const positions = Array.from(new Set(staff.map(s => s.position).filter(Boolean)))
    .filter((p): p is string => typeof p === 'string')
    .sort((a, b) => a.localeCompare(b, 'tr-TR'));

  const unifiedStaffData = useMemo(() => {
    return staff.map(s => {
      const h = hotels.find(x => x.id === s.hotelId);
      
      let acc = null;
      if (s.status === 'placed' || s.status === 'pending_checkout') {
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


  const groupedRoomsData = useMemo(() => {
    // Sadece mevcut filtrelere uyan (unifiedStaffData) ve yerleşmiş/çıkış bekleyenleri alalım
    const placedItems = unifiedStaffData.filter(item => (item.staff.status === 'placed' || item.staff.status === 'pending_checkout') && item.room);

    let targetRooms = rooms.filter(r => r.status === 'active');
    if (filterFacility) {
      targetRooms = targetRooms.filter(r => r.facilityId === filterFacility);
    }
    
    if (currentUser?.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      targetRooms = targetRooms.filter(r => facIds.includes(r.facilityId));
    }

    const result = targetRooms.map(r => {
      const f = facilities.find(x => x.id === r.facilityId);
      const items = placedItems.filter(p => p.room!.id === r.id);
      return { room: r, facility: f, items };
    });

    return result.filter(group => {
      if (globalSearch) {
        const term = globalSearch.toLowerCase();
        // Eğer aranan kelime oda numarasıyla eşleşiyorsa veya o odadaki filtrelenmiş personelle eşleşiyorsa göster
        const matchRoom = String(group.room.roomNumber).toLowerCase().includes(term);
        if (!matchRoom && group.items.length === 0) return false;
      }
      
      // Diğer durumlarda (filterStatus, vs) eğer odada hiç eşleşen personel yoksa ve filtrelenmişse:
      // Eğer "Sadece Bekleyenleri" seçmişse ve bu odada hiç placed yoksa oda boş görünecek, o yüzden filtreli listelerde items=0 ise ve özel filtre açıksa gizleyelim:
      if ((filterHotel || filterDepartment || filterStatus === 'placed' || filterStatus === 'pending_placement' || filterStatus === 'pending_checkout' || filterStatus === 'left') && group.items.length === 0) {
        return false;
      }

      return true;
    }).sort((a, b) => {
       const facA = a.facility?.name || '';
       const facB = b.facility?.name || '';
       if (facA !== facB) return facA.localeCompare(facB);
       return String(a.room.roomNumber).localeCompare(String(b.room.roomNumber), undefined, { numeric: true });
    });
  }, [unifiedStaffData, rooms, facilities, currentUser, globalSearch, filterFacility, filterHotel, filterDepartment, filterStatus]);

  const handleAddStaff = (e: import('react').FormEvent) => {
    e.preventDefault();
    if (!newStaff.fullName || !newStaff.hotelId || !canAddStaff) return;
    addStaff({ ...newStaff, status: 'pending_placement' });
    setShowAddStaffForm(false);
    
    const dHotelId = currentUser?.role === 'hotel_hr_manager' 
      ? (currentUser.assignedHotelIds?.[0] || currentUser.assignedHotelId || '') 
      : '';
    setNewStaff({ fullName: '', tcNo: '', phone: '', birthDate: '', department: '', position: '', hotelId: dHotelId, gender: 'male', notes: '', specialNote: '' });
  };

  const downloadStaffTemplate = () => {
    const data = [
      {
        "TC Kimlik No": "12345678901",
        "Ad Soyad": "Ahmet Yılmaz",
        "Telefon": "5551234567",
        "Doğum Tarihi": "1990-01-01",
        "Cinsiyet (Erkek/Kadin)": "Erkek",
        "Otel Adi veya Sube Kodu": hotels[0]?.branchCode || hotels[0]?.name || "Rubi Platinum",
        "Departman": "Mutfak",
        "Gorev": "Aşçı",
        "Lojman Adı": facilities[0]?.name || "Merkez Lojman",
        "Oda Numarası": "101",
        "Notlar": "Genel not",
        "Ozel Not (IK)": "Eşiyle kalacak"
      },
      {
        "TC Kimlik No": "98765432109",
        "Ad Soyad": "Ayşe Demir",
        "Telefon": "5559876543",
        "Doğum Tarihi": "1995-05-15",
        "Cinsiyet (Erkek/Kadin)": "Kadin",
        "Otel Adi veya Sube Kodu": hotels[0]?.branchCode || hotels[0]?.name || "Rubi Platinum",
        "Departman": "Ön Büro",
        "Gorev": "Resepsiyonist",
        "Lojman Adı": "",
        "Oda Numarası": "",
        "Notlar": "",
        "Ozel Not (IK)": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Personel Sablonu");
    XLSX.writeFile(wb, "personel_yukleme_sablonu.xlsx");
  };

  const handleFileUpload = (e: import('react').ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExcelFile(file);
      setImportLog(null);
    }
  };

  const processExcel = async () => {
    if (!excelFile) return;
    setIsImporting(true);
    setImportLog(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const newStaffList: Array<{ staff: Omit<Staff, 'id'>, placement?: { facilityId: string, roomId: string } }> = [];
        let errorCount = 0;
        let duplicateCount = 0;

        for (const row of jsonData) {
          const tcNo = String(row['TC Kimlik No'] || '').trim();
          const fullName = String(row['Ad Soyad'] || '').trim();
          const hotelNameOrCode = String(row['Otel Adi veya Sube Kodu'] || row['Otel Adi'] || '').trim();
          
          if (!fullName || !hotelNameOrCode) {
            errorCount++;
            continue;
          }

          // Duplicate check
          if (tcNo) {
            const exists = staff.some(s => s.tcNo === tcNo);
            if (exists) {
              duplicateCount++;
              continue;
            }
          }

          // Hotel check
          const hotel = hotels.find(h => 
            h.name.toLowerCase() === hotelNameOrCode.toLowerCase() || 
            (h.branchCode && h.branchCode.toLowerCase() === hotelNameOrCode.toLowerCase())
          );
          if (!hotel) {
            errorCount++;
            continue;
          }

          const genderRaw = String(row['Cinsiyet (Erkek/Kadin)'] || '').toLowerCase();
          const gender = (genderRaw === 'kadın' || genderRaw === 'kadin' || genderRaw === 'female') ? 'female' : 'male';
          
          const facilityName = String(row['Lojman Adı'] || '').trim();
          const roomNumber = String(row['Oda Numarası'] || String(row['Oda Numarasi'] || '')).trim();
          
          let placement: { facilityId: string, roomId: string } | undefined = undefined;
          
          if (facilityName && roomNumber) {
            const facility = facilities.find(f => f.name.toLowerCase() === facilityName.toLowerCase());
            if (facility) {
              const room = rooms.find(r => r.facilityId === facility.id && r.roomNumber.toLowerCase() === roomNumber.toLowerCase());
              if (room) {
                 placement = { facilityId: facility.id, roomId: room.id };
              }
            }
          }

          newStaffList.push({
            staff: {
              tcNo,
              fullName,
              phone: String(row['Telefon'] || '').trim(),
              department: String(row['Departman'] || '').trim(),
              position: String(row['Gorev'] || '').trim(),
              hotelId: hotel.id,
              status: 'pending_placement',
              gender,
              specialNote: String(row['Ozel Not (IK)'] || row['Ozel Not'] || '').trim(),
              birthDate: String(row['Doğum Tarihi'] || row['Dogum Tarihi'] || '').trim(),
              notes: String(row['Notlar'] || '').trim(),
            },
            placement
          });
        }

        if (newStaffList.length > 0) {
          await bulkAddStaffWithPlacements(newStaffList);
          setImportLog({
            success: true,
            message: `${newStaffList.length} personel başarıyla eklendi. (Hatalı: ${errorCount}, Mükerrer: ${duplicateCount})`
          });
          setTimeout(() => {
            setShowAddStaffForm(false);
            setExcelFile(null);
            setImportLog(null);
          }, 2000);
        } else {
          setImportLog({
            success: false,
            message: `Eklenecek geçerli personel bulunamadı. (Hatalı: ${errorCount}, Mükerrer: ${duplicateCount})`
          });
        }

      } catch (err) {
        setImportLog({ success: false, message: 'Excel dosyası okunurken bir hata oluştu.' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(excelFile);
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
      notes: staffData.notes || '',
      specialNote: staffData.specialNote || ''
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

  const handleBulkDelete = async () => {
    if (selectedStaffIds.length === 0) return;
    if (confirm(`Seçili ${selectedStaffIds.length} personeli ve tüm konaklama kayıtlarını silmek istediğinize emin misiniz?`)) {
      await bulkDeleteStaff(selectedStaffIds);
      setSelectedStaffIds([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === unifiedStaffData.length && unifiedStaffData.length > 0) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(unifiedStaffData.map(item => item.staff.id));
    }
  };

  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const exportToExcel = () => {
    if (unifiedStaffData.length === 0) {
      alert("Dışa aktarılacak veri bulunamadı.");
      return;
    }

    const dataToExport = unifiedStaffData.map(item => {
      let statusStr = '';
      if (item.staff.status === 'placed') statusStr = 'Konaklıyor';
      else if (item.staff.status === 'pending_placement') statusStr = 'Yerleşim Bekliyor';
      else if (item.staff.status === 'pending_checkout') statusStr = 'Çıkış Bekliyor';
      else if (item.staff.status === 'left') statusStr = 'Çıkış Yaptı';

      return {
        'TC Kimlik No': item.staff.tcNo || '',
        'Ad Soyad': item.staff.fullName || '',
        'Telefon': item.staff.phone || '',
        'Doğum Tarihi': item.staff.birthDate ? new Date(item.staff.birthDate).toLocaleDateString('tr-TR') : '',
        'Cinsiyet': item.staff.gender === 'female' ? 'Kadın' : 'Erkek',
        'Otel/İşletme': item.hotel?.name || '-',
        'Departman': item.staff.department || '-',
        'Görev': item.staff.position || '-',
        'Durum': statusStr,
        'Lojman': item.facility?.name || '-',
        'Oda No': item.room?.roomNumber || '-',
        'Giriş Tarihi': item.acc?.checkInDate ? new Date(item.acc.checkInDate).toLocaleDateString('tr-TR') : '-',
        'Çıkış Tarihi': item.acc?.checkOutDate ? new Date(item.acc.checkOutDate).toLocaleDateString('tr-TR') : '-',
        'Özel Not': item.staff.specialNote || '-',
        'Genel Not': item.staff.notes || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Auto-size columns slightly
    const colWidths = [
      { wch: 15 }, // TC
      { wch: 25 }, // Ad Soyad
      { wch: 15 }, // Telefon
      { wch: 15 }, // Doğum
      { wch: 10 }, // Cinsiyet
      { wch: 20 }, // Otel
      { wch: 20 }, // Departman
      { wch: 20 }, // Görev
      { wch: 15 }, // Durum
      { wch: 20 }, // Lojman
      { wch: 10 }, // Oda
      { wch: 15 }, // Giriş
      { wch: 15 }, // Çıkış
      { wch: 30 }, // Özel Not
      { wch: 30 }, // Genel Not
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Personel_Listesi");
    
    XLSX.writeFile(workbook, `Personel_Listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!canViewPage(currentUser?.role, PAGE_KEYS.staff, useStore.getState().rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="shrink-0">
        <PageHeader
          title="Personel Yönetimi"
          description="Personel listesi, giriş-çıkış işlemleri ve oda yerleşimleri (allocation)."
          actions={
            <div className="flex items-center gap-3">
              <button 
                onClick={exportToExcel}
                className="px-4 py-2 bg-white text-stone-700 border border-[#E8E6E1] rounded-xl text-sm font-semibold shadow-sm hover:bg-stone-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Excel'e Aktar
              </button>
              {canDeleteStaff && selectedStaffIds.length > 0 && (
                <button 
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold shadow-sm hover:bg-red-100 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Seçilenleri Sil ({selectedStaffIds.length})
                </button>
              )}
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
          }
        />
      </div>

      {/* Status Tabs */}
      <div className="flex justify-between items-center border-b border-[#E8E6E1] shrink-0 px-2">
        <div className="flex gap-4">
          {[
            { id: '', label: 'Tüm Personeller' },
            { id: 'placed', label: 'Konaklıyor' },
            { id: 'pending_placement', label: 'Yerleşim Bekliyor' },
            { id: 'pending_checkout', label: 'Çıkış Bekliyor' },
            { id: 'left', label: 'Çıkış Yaptı' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                "pb-3 text-sm font-semibold transition-colors whitespace-nowrap relative",
                filterStatus === tab.id 
                  ? "text-[#7C8363]" 
                  : "text-stone-500 hover:text-stone-700"
              )}
            >
              {filterStatus === tab.id && (
                <motion.div
                  layoutId="activeTabStatus"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7C8363]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-stone-500 font-medium pb-3">
          {unifiedStaffData.length} Kayıt
        </div>
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
            <div className="flex items-center bg-[#E8E6E1] p-1 rounded-xl h-full mt-1 shrink-0 ml-2 shadow-sm border border-[#E8E6E1]">
               <button
                 onClick={() => setViewMode('list')}
                 className={cn("px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors", viewMode === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700')}
               >
                 <List className="w-4 h-4"/> Liste
               </button>
               <button
                 onClick={() => setViewMode('grouped')}
                 className={cn("px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors", viewMode === 'grouped' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700')}
               >
                 <LayoutGrid className="w-4 h-4"/> Odalar
               </button>
            </div>
          </div>
        </div>

      {viewMode === 'list' && (
      <div className="card-standard flex flex-col bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left relative">
              <thead className="bg-[#FDFCFB] sticky top-0 z-10 shadow-sm border-b border-[#E8E6E1]">
                <tr>
                  {canDeleteStaff && (
                    <th className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedStaffIds.length > 0 && selectedStaffIds.length === unifiedStaffData.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-stone-300 text-[#7C8363] focus:ring-[#7C8363]"
                      />
                    </th>
                  )}
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
                    <td colSpan={canDeleteStaff ? 9 : 8} className="px-6 py-12 text-center text-stone-500">
                      Seçilen kriterlere uygun personel bulunamadı.
                    </td>
                  </tr>
                ) : (
                  unifiedStaffData.map(({ staff: s, hotel: h, acc, facility: f, room: r }) => (
                    <tr key={s.id} className={cn("hover:bg-stone-50 transition-colors", selectedStaffIds.includes(s.id) && "bg-[#FDFCFB]")}>
                      {canDeleteStaff && (
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedStaffIds.includes(s.id)}
                            onChange={() => toggleSelectStaff(s.id)}
                            className="w-4 h-4 rounded border-stone-300 text-[#7C8363] focus:ring-[#7C8363]"
                          />
                        </td>
                      )}
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
                          {s.status === 'pending_checkout' && (
                             <>
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200">
                                 Çıkış Bekliyor
                               </span>
                               <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                                 G: {acc?.checkInDate ? new Date(acc.checkInDate).toLocaleDateString('tr-TR') : '-'}
                               </span>
                             </>
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
                            {s.status === 'placed' && canEditStaff && acc && (
                              <button 
                                onClick={() => {
                                  if(confirm(`${s.fullName} isimli personel için Çıkış Bekliyor durumunu bildirmek istediğinize emin misiniz?`)) {
                                    notifyCheckoutStaff(s.id);
                                  }
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <LogOut className="w-4 h-4" /> Çıkış Bildir
                              </button>
                            )}
                            {(s.status === 'placed' || s.status === 'pending_checkout') && canCheckoutStaff && acc && (
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
                            {(s.status === 'placed' || s.status === 'pending_checkout') && canChangeRoom && (
                               <button 
                                 onClick={() => {
                                   if(acc) {
                                     setChangingRoomStaffInfo({ staff: s, currentRoomId: acc.roomId, currentFacilityId: acc.facilityId });
                                   }
                                 }}
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
      )}

      {viewMode === 'grouped' && (
        <div className="flex flex-col gap-6">
          {groupedRoomsData.length === 0 ? (
            <div className="card-standard p-12 text-center text-stone-500">
              Seçilen kriterlere uygun oda veya personel bulunamadı.
            </div>
          ) : (
            groupedRoomsData.map((group) => {
              const capacity = group.room.bedCount || 0;
              const actualOccupied = accommodations.filter(a => a.roomId === group.room.id && a.status === 'active').length;
              const occupancyRate = capacity > 0 ? (actualOccupied / capacity) * 100 : 0;
              
              return (
                <div key={group.room.id} className="card-standard bg-white overflow-hidden">
                  <div className="bg-[#FDFCFB] px-6 py-4 border-b border-[#E8E6E1] flex justify-between items-center">
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold tracking-tight text-stone-800 text-xl font-mono">
                            Oda {group.room.roomNumber}
                          </h3>
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", group.room.genderType === 'female' ? "bg-pink-50 text-pink-700" : (group.room.genderType === 'male' ? "bg-blue-50 text-blue-700" : (group.room.genderType === 'Aile' ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700")))}>
                            {group.room.genderType === 'female' ? 'KADIN' : (group.room.genderType === 'male' ? 'ERKEK' : (group.room.genderType === 'Aile' ? 'AİLE ODASI' : 'KARMA'))}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">{group.facility?.name || 'Bilinmeyen Lojman'}</p>
                     </div>
                     <div className="flex flex-col items-end gap-1.5">
                       <div className="text-xs font-bold text-stone-600 uppercase tracking-widest">
                         Doluluk: {actualOccupied} / {capacity}
                       </div>
                       <div className="w-32 h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner flex">
                         <div 
                           className={cn("h-full transition-all", occupancyRate >= 100 ? "bg-red-500" : (occupancyRate > 0 ? "bg-[#7C8363]" : "bg-stone-300"))} 
                           style={{ width: `${Math.min(occupancyRate, 100)}%` }} 
                         />
                       </div>
                     </div>
                  </div>
                  
                  {group.items.length === 0 ? (
                    <div className="px-6 py-6 text-sm text-stone-400 italic text-center">
                       {actualOccupied > 0 ? "Filtreleme kriterlerinize uyan personel gösterilmiyor." : "Bu odada şu an konaklayan personel bulunmuyor."}
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E8E6E1]">
                       {group.items.map(item => (
                         <div key={item.staff.id} className="px-6 py-3 flex items-center hover:bg-stone-50 transition-colors">
                           <div className="flex-1 flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
                               <span className="text-stone-500 text-xs font-bold">{item.staff.fullName.charAt(0)}</span>
                             </div>
                             <div>
                               <div className="flex items-center gap-2">
                                 <p className="text-sm font-bold text-stone-800">{item.staff.fullName}</p>
                                 {item.staff.status === 'pending_checkout' && (
                                   <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
                                     Çıkış Bekliyor
                                   </span>
                                 )}
                                 {/* Tooltip info icon implementation directly on names or info icon if exists */}
                                 <div 
                                   className="relative flex items-center justify-center"
                                   onMouseEnter={(e) => {
                                     const rect = e.currentTarget.getBoundingClientRect();
                                     setTooltipData({ x: rect.left + rect.width / 2, y: rect.top, staffId: item.staff.id });
                                   }}
                                   onMouseLeave={() => setTooltipData(null)}
                                 >
                                   <Info className="w-4 h-4 text-stone-400 hover:text-[#7C8363] cursor-help" />
                                 </div>
                               </div>
                               <div className="flex text-[11px] text-stone-500 font-medium mt-0.5 divide-x divide-stone-300">
                                 <span className="pr-2">{item.hotel?.name || '-'}</span>
                                 <span className="px-2">{item.staff.department || '-'} / {item.staff.position || '-'}</span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="shrink-0 text-right pr-6 border-r border-[#E8E6E1] mr-6">
                             <div className="text-xs text-stone-500 font-medium whitespace-nowrap">Giriş: {item.acc?.checkInDate ? new Date(item.acc.checkInDate).toLocaleDateString('tr-TR') : '-'}</div>
                           </div>
                           
                           <div className="shrink-0 pl-2">
                             {(canPlaceStaff || canCheckoutStaff || canEditStaff || canDeleteStaff || canViewDoc) ? (
                               <ActionMenu>
                                 {item.staff.status === 'placed' && canEditStaff && item.acc && (
                                   <button 
                                     onClick={() => {
                                       if(confirm(`${item.staff.fullName} isimli personel için Çıkış Bekliyor durumunu bildirmek istediğinize emin misiniz?`)) {
                                         notifyCheckoutStaff(item.staff.id);
                                       }
                                     }}
                                     className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                   >
                                     <LogOut className="w-4 h-4" /> Çıkış Bildir
                                   </button>
                                 )}
                                 {(item.staff.status === 'placed' || item.staff.status === 'pending_checkout') && canCheckoutStaff && item.acc && (
                                   <button 
                                     onClick={() => {
                                       if(confirm(`${item.staff.fullName} isimli personelin lojmandan çıkışını yapmak istediğinize emin misiniz?`)) {
                                         checkoutStaff(item.acc!.id, new Date().toISOString().split('T')[0]);
                                       }
                                     }}
                                     className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                   >
                                     <LogOut className="w-4 h-4" /> Çıkış Yap
                                   </button>
                                 )}
                                 {(item.staff.status === 'placed' || item.staff.status === 'pending_checkout') && canChangeRoom && item.acc && (
                                    <button 
                                      onClick={() => setChangingRoomStaffInfo({ staff: item.staff, currentRoomId: item.acc!.roomId, currentFacilityId: item.acc!.facilityId })}
                                      className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                    >
                                      <Replace className="w-4 h-4" /> Oda Değiştir
                                    </button>
                                 )}
                                 {canViewLogs && (
                                   <button 
                                     onClick={() => setLogsModalStaffId(item.staff.id)}
                                     className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"
                                   >
                                     <Clock className="w-4 h-4" /> İşlem Geçmişi
                                   </button>
                                 )}
                                 {canEditStaff && (
                                   <button 
                                     onClick={() => handleOpenEdit(item.staff)}
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
                                     onClick={() => { if(confirm(`${item.staff.fullName} isimli personelin kaydını tamamen silmek istediğinize emin misiniz?`)) deleteStaff(item.staff.id); }}
                                     className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-stone-100 mt-1 pt-1"
                                   >
                                     <Trash2 className="w-4 h-4" /> Kaydı Sil
                                   </button>
                                 )}
                               </ActionMenu>
                             ) : (
                               <MoreVertical className="w-5 h-5 text-stone-300" />
                             )}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <AnimatePresence>
      {showAddStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl min-h-[500px] flex flex-col"
          >
            <h3 className="text-xl font-bold mb-4 text-[#2D332D]">Yeni Personel Kaydı</h3>
            
            <div className="flex border-b border-[#E8E6E1] mb-6">
              <button
                className={cn('px-4 py-2 font-medium text-sm transition-colors', addStaffTab === 'single' ? 'text-[#7C8363] border-b-2 border-[#7C8363]' : 'text-stone-500 hover:text-stone-700')}
                onClick={() => setAddStaffTab('single')}
              >
                Tekli Kayıt
              </button>
              <button
                className={cn('px-4 py-2 font-medium text-sm transition-colors', addStaffTab === 'bulk' ? 'text-[#7C8363] border-b-2 border-[#7C8363]' : 'text-stone-500 hover:text-stone-700')}
                onClick={() => setAddStaffTab('bulk')}
              >
                Excel ile Yükle
              </button>
            </div>

            {addStaffTab === 'single' ? (
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Ad Soyad *</label>
                  <input required type="text" value={newStaff.fullName} onChange={e => setNewStaff({...newStaff, fullName: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="Personel ad ve soyadı" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Doğum Tarihi</label>
                  <input type="date" value={newStaff.birthDate} onChange={e => setNewStaff({...newStaff, birthDate: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport</label>
                  <input type="text" value={newStaff.tcNo} onChange={e => setNewStaff({...newStaff, tcNo: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" placeholder="TC veya Pasaport No" />
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
                  <input type="text" list="departments-list" value={newStaff.department} onChange={e => setNewStaff({...newStaff, department: e.target.value})} placeholder="Örn: Mutfak" className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                  <datalist id="departments-list">
                    {departments.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                  <input type="text" list="positions-list" value={newStaff.position} onChange={e => setNewStaff({...newStaff, position: e.target.value})} placeholder="Örn: Aşçı" className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                  <datalist id="positions-list">
                    {positions.map(p => <option key={p} value={p} />)}
                  </datalist>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Notlar / Açıklama</label>
                  <textarea value={newStaff.notes} onChange={e => setNewStaff({...newStaff, notes: e.target.value})} placeholder="Personel ile ilgili notlar..." className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] min-h-[80px]" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Sıra Dışı Yerleşim (İK Notu)</label>
                  <textarea value={newStaff.specialNote} onChange={e => setNewStaff({...newStaff, specialNote: e.target.value})} placeholder="Örn: Eşi Ayşe Yılmaz ile Aile odasında kalacak." className="w-full px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm focus:outline-none focus:border-red-400 min-h-[60px]" />
                </div>
                
                <div className="md:col-span-2 flex justify-end gap-3 mt-auto pt-4">
                  <button type="button" onClick={() => setShowAddStaffForm(false)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                  <button type="submit" className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4"/> Kaydet</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col flex-1">
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mb-6">
                  <h4 className="font-semibold text-stone-800 flex items-center gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-500"/> Nasıl Yüklenir?
                  </h4>
                  <p className="text-sm text-stone-600 mb-4 leading-relaxed">
                    Aşağıdaki örnek şablonu indirerek personellerinizi Excel'e kaydedin. Sütun isimlerini değiştirmeyin. Yeni eklenen tüm personeller varsayılan olarak "Yerleşim Bekliyor" statüsünde sisteme dahil edilecektir.
                  </p>
                  <button onClick={downloadStaffTemplate} className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 text-blue-700 font-medium rounded-xl border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Download className="w-4 h-4"/> Örnek Şablonu İndir
                  </button>
                </div>

                <div className="border-2 border-dashed border-stone-300 rounded-xl p-8 flex flex-col items-center justify-center text-center flex-1 min-h-[200px]">
                  <UploadCloud className="w-12 h-12 text-stone-300 mb-3"/>
                  <h5 className="font-semibold text-stone-700 mb-1">Excel Dosyanızı Yükleyin</h5>
                  <p className="text-xs text-stone-500 mb-4 max-w-xs">.xlsx veya .xls uzantılı şablon dosyanızı buraya sürükleyin veya seçin.</p>
                  
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-stone-800 text-white font-medium rounded-lg text-sm hover:bg-stone-700 transition-colors">
                    Dosya Seç ({excelFile ? excelFile.name : 'Seçilmedi'})
                  </button>
                </div>

                {importLog && (
                   <div className={cn("mt-4 p-4 rounded-xl text-sm font-medium", importLog.success ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200")}>
                     {importLog.message}
                   </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E8E6E1]">
                  <button type="button" onClick={() => setShowAddStaffForm(false)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                  <button onClick={processExcel} disabled={!excelFile || isImporting} className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
                    {isImporting ? 'Yükleniyor...' : <><CheckCircle className="w-4 h-4"/> Verileri Yükle</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {selectedStaffIdToPlace && staffToPlace && (
        <CheckInWizard staffMember={staffToPlace} onClose={() => setSelectedStaffIdToPlace(null)} />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {/* Edit Staff Modal */}
      {editingStaffId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]"
          >
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
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">TC Kimlik / Pasaport</label>
                <input type="text" value={editForm.tcNo} onChange={e => setEditForm({...editForm, tcNo: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
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
                <input type="text" list="departments-list-edit" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                <datalist id="departments-list-edit">
                  {departments.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Görev / Pozisyon</label>
                <input type="text" list="positions-list-edit" value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363]" />
                <datalist id="positions-list-edit">
                  {positions.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Notlar / Açıklama</label>
                <textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Personel ile ilgili notlar..." className="w-full px-4 py-2 border border-[#E8E6E1] rounded-xl text-sm focus:outline-none focus:border-[#7C8363] min-h-[80px]" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-stone-500 uppercase mb-1">Sıra Dışı Yerleşim (İK Notu)</label>
                <textarea value={editForm.specialNote} onChange={e => setEditForm({...editForm, specialNote: e.target.value})} placeholder="Örn: Eşi Ayşe Yılmaz ile Aile odasında kalacak." className="w-full px-4 py-2 border border-red-200 bg-red-50 rounded-xl text-sm focus:outline-none focus:border-red-400 min-h-[60px]" />
              </div>
              
              <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setEditingStaffId(null)} className="px-6 py-2 border border-[#E8E6E1] bg-white text-stone-600 rounded-xl hover:bg-stone-50 font-semibold text-sm">İptal</button>
                <button type="submit" disabled={isSavingEdit} className="px-6 py-2 bg-[#7C8363] text-white rounded-xl hover:bg-[#6A7152] font-semibold text-sm flex items-center gap-2">
                  {isSavingEdit ? 'Kaydediliyor...' : <><Edit2 className="w-4 h-4"/> Kaydet</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {/* Staff Logs Modal */}
      {logsModalStaffId && (
        <StaffLogsModal staffId={logsModalStaffId} onClose={() => setLogsModalStaffId(null)} />
      )}
      </AnimatePresence>

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
        {/* Room Change Wizard */}
      <AnimatePresence>
      {changingRoomStaffInfo && (
        <RoomChangeWizard 
          staff={changingRoomStaffInfo.staff}
          currentRoomId={changingRoomStaffInfo.currentRoomId}
          currentFacilityId={changingRoomStaffInfo.currentFacilityId}
          onClose={() => setChangingRoomStaffInfo(null)}
        />
      )}
      </AnimatePresence>
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
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative"
      >
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
      </motion.div>
    </div>
  );
}
