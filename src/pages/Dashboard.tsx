import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  BedDouble, 
  Activity,
  UserPlus,
  Building,
  ShieldAlert,
  Wrench
} from "lucide-react";

import { useStore } from "../store/useStore";
import { usePageRefresh } from "../hooks/usePageRefresh";
import { canViewPage, can, PAGE_KEYS } from "../lib/permissions";
import { PageHeader } from "../components/layout/PageHeader";

// Modular sub-components
import CapacitySection from "../components/dashboard/CapacitySection";
import MatrixSection from "../components/dashboard/MatrixSection";
import MaintenanceSection from "../components/dashboard/MaintenanceSection";

export default function Dashboard() {
  const navigate = useNavigate();
  const refreshAction = usePageRefresh();

  // Store lists
  const facilities = useStore(state => state.facilities);
  const rooms = useStore(state => state.rooms);
  const accommodations = useStore(state => state.accommodations);
  const staff = useStore(state => state.staff);
  const hotels = useStore(state => state.hotels);
  const maintenanceTickets = useStore(state => state.maintenanceTickets);
  const currentUser = useStore(state => state.currentUser);

  // --- Dynamic Security Guards & RBAC Filtering (Stage 1) ---
  const hasFullAccess = useMemo(() => {
    return ['super_admin', 'hr_director'].includes(currentUser?.role || '');
  }, [currentUser]);

  const directDormIds = useMemo(() => {
    if (hasFullAccess) return facilities.map(f => f.id);
    return currentUser?.assignedFacilityIds || (currentUser?.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
  }, [hasFullAccess, facilities, currentUser]);

  const userHotelIds = useMemo(() => {
    return currentUser?.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser?.assignedHotelId ? [currentUser.assignedHotelId] : []);
  }, [currentUser]);

  const staffRoomIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    const activeStaffIds = new Set(
      staff.filter(s => ['placed', 'pending_checkout'].includes(s.status) && (hasFullAccess || userHotelIds.includes(s.hotelId))).map(s => s.id)
    );
    const roomIds = accommodations
      .filter(acc => acc.status === 'active' && activeStaffIds.has(acc.staffId))
      .map(acc => acc.roomId);
    return new Set(roomIds);
  }, [currentUser, staff, accommodations, hasFullAccess, userHotelIds]);

  const staffDormIds = useMemo(() => {
    return new Set(
      rooms.filter(r => staffRoomIds.has(r.id)).map(r => r.facilityId)
    );
  }, [rooms, staffRoomIds]);

  // Maximum boundary of allowed facilities for the user
  const availableFacilities = useMemo(() => {
    if (hasFullAccess) return facilities;
    const result = new Set<string>(directDormIds);
    staffDormIds.forEach(id => result.add(id));
    const allowedSet = Array.from(result);
    return facilities.filter(f => allowedSet.includes(f.id));
  }, [hasFullAccess, facilities, directDormIds, staffDormIds]);

  // Maximum boundary of allowed hotels for the user
  const availableHotels = useMemo(() => {
    if (hasFullAccess) return hotels;
    return hotels.filter(h => userHotelIds.includes(h.id));
  }, [hasFullAccess, hotels, userHotelIds]);

  // Dynamically allowed facility/dorm IDs (scoped by permission, no selection)
  const allowedDormIds = useMemo(() => {
    return availableFacilities.map(f => f.id);
  }, [availableFacilities]);

  // Dynamically allowed staff (scoped by permission, no selection)
  const allowedStaff = useMemo(() => {
    let baseStaff = staff;
    if (!hasFullAccess) {
      if (currentUser?.role === 'hotel_hr_manager') {
        baseStaff = staff.filter(s => userHotelIds.includes(s.hotelId));
      } else if (currentUser?.role === 'facility_manager') {
        const allowedDormSet = new Set(availableFacilities.map(f => f.id));
        const staffWithAcc = new Set(accommodations.filter(a => allowedDormSet.has(a.facilityId)).map(a => a.staffId));
        baseStaff = staff.filter(s => staffWithAcc.has(s.id));
      }
    }
    return baseStaff;
  }, [staff, hasFullAccess, currentUser, userHotelIds, availableFacilities, accommodations]);

  // --- Dynamic Matrix and Shared Rooms Data (Stage 3) ---
  const { matrixHotels, facilityHotelMatrix, hotelTotals, sharedRoomPairsList } = useMemo(() => {
    const activeRooms = rooms.filter(r => allowedDormIds.includes(r.facilityId) && r.status === 'active');
    const activeAccs = accommodations.filter(a => a.status === 'active' && allowedDormIds.includes(a.facilityId));
    const activeStaffIds = new Set(activeAccs.map(a => a.staffId));
    
    const activeStaff = staff.filter(s => s.status === 'placed' && activeStaffIds.has(s.id) && allowedStaff.some(as => as.id === s.id));
    const activeStaffSet = new Set(activeStaff.map(s => s.id));
    const activeAccsFiltered = activeAccs.filter(a => activeStaffSet.has(a.staffId));

    const matrixHotels = hotels.filter(h => activeStaff.some(s => s.hotelId === h.id));

    const facilityHotelMatrix = facilities.filter(f => allowedDormIds.includes(f.id)).map(fac => {
      const rowStats: Record<string, number> = {};
      matrixHotels.forEach(h => { rowStats[h.id] = 0; });
      let rowTotal = 0;
      
      const facAccs = activeAccsFiltered.filter(a => a.facilityId === fac.id);
      facAccs.forEach(a => {
        const s = activeStaff.find(st => st.id === a.staffId);
        if (s && s.hotelId && rowStats[s.hotelId] !== undefined) {
          rowStats[s.hotelId]++;
          rowTotal++;
        }
      });
      return {
        facility: fac,
        stats: rowStats,
        total: rowTotal
      };
    }).filter(row => row.total > 0);

    const hotelTotals: Record<string, number> = {};
    matrixHotels.forEach(h => {
      hotelTotals[h.id] = facilityHotelMatrix.reduce((sum, row) => sum + (row.stats[h.id] || 0), 0);
    });

    // Shared Room Pairs
    const sharedRoomPairs: Record<string, { 
      name: string; 
      count: number; 
      roomNames: string[];
      details: {
        roomId: string;
        roomNumber: string;
        facilityId: string;
        facilityName: string;
        occupants: {
          staffId: string;
          name: string;
          hotelId: string;
          hotelName: string;
          department: string;
        }[];
      }[];
    }> = {};
    
    activeRooms.forEach(room => {
      const roomAccs = activeAccsFiltered.filter(a => a.roomId === room.id);
      const rStaff = activeStaff.filter(s => roomAccs.some(a => a.staffId === s.id));
      const uniqueHotelIds = Array.from(new Set(rStaff.map(s => s.hotelId).filter(Boolean)));
      
      if (uniqueHotelIds.length > 1) {
        const facName = facilities.find(f => f.id === room.facilityId)?.name || 'Bilinmeyen Lojman';
        
        const occupantsDetail = roomAccs.map(acc => {
          const s = activeStaff.find(st => st.id === acc.staffId);
          const hotelObj = hotels.find(h => h.id === s?.hotelId);
          const hotelName = hotelObj?.branchCode || hotelObj?.name || 'Bilinmeyen Otel';
          return {
            staffId: acc.staffId,
            name: s ? s.fullName : 'Bilinmeyen Personel',
            hotelId: s?.hotelId || '',
            hotelName,
            department: s?.department || 'Tanımsız'
          };
        });

        for (let i = 0; i < uniqueHotelIds.length; i++) {
          for (let j = i + 1; j < uniqueHotelIds.length; j++) {
            const h1 = uniqueHotelIds[i];
            const h2 = uniqueHotelIds[j];
            const h1Name = hotels.find(h => h.id === h1)?.branchCode || hotels.find(h => h.id === h1)?.name || h1;
            const h2Name = hotels.find(h => h.id === h2)?.branchCode || hotels.find(h => h.id === h2)?.name || h2;
            const pairName = [h1Name, h2Name].sort().join(' & ');
            
            if (!sharedRoomPairs[pairName]) {
              sharedRoomPairs[pairName] = {
                name: pairName,
                count: 0,
                roomNames: [],
                details: []
              };
            }
            sharedRoomPairs[pairName].count++;
            sharedRoomPairs[pairName].roomNames.push(room.roomNumber);
            sharedRoomPairs[pairName].details.push({
              roomId: room.id,
              roomNumber: room.roomNumber,
              facilityId: room.facilityId,
              facilityName: facName,
              occupants: occupantsDetail
            });
          }
        }
      }
    });

    const sharedRoomPairsList = Object.values(sharedRoomPairs).sort((a, b) => b.count - a.count);

    return {
      matrixHotels,
      facilityHotelMatrix,
      hotelTotals,
      sharedRoomPairsList
    };
  }, [rooms, accommodations, staff, allowedStaff, hotels, facilities, allowedDormIds]);

  // RBAC Security Gate Check
  if (!canViewPage(currentUser?.role, PAGE_KEYS.dashboard, useStore.getState().rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok. Yönetici ile iletişime geçin.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col p-6 space-y-8">
      {/* Page Header */}
      <PageHeader 
        title="Anlık Durum & Özet Dashboard"
        description="Lojmanlarınızın anlık doluluk oranları, kapasite durumları ve teknik arızaların gerçek zamanlı özeti."
        actions={[
          refreshAction,
          ...(can(currentUser?.role, 'create_staff', PAGE_KEYS.staff, useStore.getState().rolesPermissions) ? [{
            key: 'new_staff',
            icon: UserPlus,
            tooltip: 'Yeni Talep',
            onClick: () => navigate('/staff'),
            colorClass: 'bg-white text-stone-700 border border-[#E8E6E1] hover:bg-stone-50'
          }] : []),
          ...(can(currentUser?.role, 'change_room', PAGE_KEYS.staff, useStore.getState().rolesPermissions) ? [{
            key: 'place_staff',
            icon: BedDouble,
            tooltip: 'Yerleşim Yap',
            onClick: () => navigate('/staff')
          }] : [])
        ]}
      />

      {/* Kapsam ve Bilgilendirme Alanı */}
      <div className="bg-[#FAF9F6] border border-stone-200/60 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#7C8363]/10 text-[#7C8363] rounded-xl shrink-0">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#2D332D]">Aktif Veri Kapsamı</h3>
            <p className="text-xs text-stone-500">
              {currentUser?.role === 'super_admin' && "Süper Yönetici yetkisiyle tüm tesis ve otel verileri otomatik olarak listelenmektedir."}
              {currentUser?.role === 'hr_director' && "İK Direktörü yetkisiyle tüm tesis ve otel verileri otomatik olarak listelenmektedir."}
              {currentUser?.role === 'hotel_hr_manager' && "Sadece bağlı olduğunuz otel ve bu otel personelinin konakladığı lojmanların verileri listelenmektedir."}
              {currentUser?.role === 'facility_manager' && "Sadece yönetmekle görevli olduğunuz lojmanların ve bu lojmanlardaki personellerin verileri listelenmektedir."}
              {!['super_admin', 'hr_director', 'hotel_hr_manager', 'facility_manager'].includes(currentUser?.role || '') && "Rolünüz kapsamındaki sınırlandırılmış veriler otomatik olarak listelenmektedir."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold">
            <span className="text-stone-400 mr-1.5">Rol:</span>
            {currentUser?.role === 'super_admin' && "Süper Admin"}
            {currentUser?.role === 'hr_director' && "İK Direktörü"}
            {currentUser?.role === 'hotel_hr_manager' && "Otel İK Müdürü"}
            {currentUser?.role === 'facility_manager' && "Lojman Sorumlusu"}
            {!['super_admin', 'hr_director', 'hotel_hr_manager', 'facility_manager'].includes(currentUser?.role || '') && (currentUser?.role || 'Bilinmeyen')}
          </div>

          {availableHotels.length > 0 && (
            <div className="px-3.5 py-1.5 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl text-xs font-semibold">
              <span className="text-stone-400 mr-1.5">Otel:</span>
              {hasFullAccess ? "Tüm Oteller" : availableHotels.map(h => h.branchCode || h.name).join(', ')}
            </div>
          )}

          {availableFacilities.length > 0 && (
            <div className="px-3.5 py-1.5 bg-[#7C8363]/5 border border-[#7C8363]/15 text-[#3B422B] rounded-xl text-xs font-semibold">
              <span className="text-[#7C8363] mr-1.5">Lojman:</span>
              {hasFullAccess ? "Tüm Lojmanlar" : availableFacilities.map(f => f.name).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* AŞAMA 1: Kapasite ve Anlık Doluluk */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold text-[#2D332D] border-b border-stone-200 pb-2 flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#7C8363]" />
          Kapasite ve Anlık Doluluk (Real-time Snapshot)
        </h3>
        <CapacitySection 
          rooms={rooms}
          accommodations={accommodations}
          staff={staff}
          allowedDormIds={allowedDormIds}
          facilities={facilities}
          hotels={hotels}
        />
      </div>

      {/* AŞAMA 3: Otel - Lojman Kullanım Matrisi & Ortak Kullanımlar */}
      <div className="space-y-4 relative z-20">
        <h3 className="text-xl font-serif font-bold text-[#2D332D] border-b border-stone-200 pb-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-[#7C8363]" />
          Otel - Lojman Kullanım Matrisi ve Paylaşımlar
        </h3>
        <MatrixSection 
          matrixHotels={matrixHotels}
          facilityHotelMatrix={facilityHotelMatrix}
          hotelTotals={hotelTotals}
          activeStaffCount={staff.filter(s => s.status === 'placed' && allowedStaff.some(as => as.id === s.id)).length}
          sharedRoomPairsList={sharedRoomPairsList}
        />
      </div>

      {/* AŞAMA 4: Arıza ve Bakım Derinlemesine Analizi */}
      <div className="space-y-4">
        <h3 className="text-xl font-serif font-bold text-[#2D332D] border-b border-stone-200 pb-2 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-[#7C8363]" />
          Arıza ve Bakım Teknik Analiz Raporları
        </h3>
        <MaintenanceSection 
          maintenanceTickets={maintenanceTickets}
          allowedDormIds={allowedDormIds}
          facilities={facilities}
          rooms={rooms}
        />
      </div>

    </div>
  );
}
