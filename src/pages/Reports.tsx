import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  BedDouble, 
  Activity,
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Filter,
  Check,
  ChevronDown,
  X,
  ShieldAlert,
  Building,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import * as XLSX from "xlsx";

import { useStore } from "../store/useStore";
import { usePageRefresh } from "../hooks/usePageRefresh";
import { canViewPage, can, PAGE_KEYS } from "../lib/permissions";
import { cn } from "../lib/utils";
import { PageHeader } from "../components/layout/PageHeader";

// Modular trend sub-component
import TrendSection from "../components/dashboard/TrendSection";
import PeriodMatrixSection from "../components/dashboard/PeriodMatrixSection";

// --- Date Helpers ---
function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDaysDiff(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function getOccupiedNightsForAcc(checkInStr: string, checkOutStr: string, filterStartStr: string, filterEndStr: string): string[] {
  const nights: string[] = [];
  
  // parse dates
  const checkIn = parseDateString(checkInStr);
  const checkOut = parseDateString(checkOutStr);
  const filterStart = parseDateString(filterStartStr);
  const filterEnd = parseDateString(filterEndStr);
  
  // Find actual start and end for overlap
  const start = checkIn > filterStart ? checkIn : filterStart;
  const end = checkOut < filterEnd ? checkOut : filterEnd;
  
  const current = new Date(start);
  while (current < end) {
    const yStr = current.getFullYear();
    const mStr = String(current.getMonth() + 1).padStart(2, '0');
    const dStr = String(current.getDate()).padStart(2, '0');
    nights.push(`${yStr}-${mStr}-${dStr}`);
    current.setDate(current.getDate() + 1);
  }
  return nights;
}

const getInitialRange = (type: string) => {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (type === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatYMD(start), end: formatYMD(end) };
  } else if (type === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: formatYMD(start), end: formatYMD(end) };
  } else if (type === 'ytd') {
    const start = new Date(now.getFullYear(), 0, 1);
    return { start: formatYMD(start), end: formatYMD(now) };
  }
  return { start: formatYMD(new Date(now.getFullYear(), now.getMonth(), 1)), end: formatYMD(now) };
};

export default function Reports() {
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
  const rolesPermissions = useStore(state => state.rolesPermissions);

  // Today formatted date string
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Range selections - initialize with defaults
  const initialRange = useMemo(() => getInitialRange('this_month'), []);

  // Real Active selections (used for the generated report calculations)
  const [rangeType, setRangeType] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>(initialRange.start);
  const [endDate, setEndDate] = useState<string>(initialRange.end);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);

  // Staged/Temporary selections (modified by UI, committed on "Raporla" click)
  const [tempRangeType, setTempRangeType] = useState<string>('this_month');
  const [tempStartDate, setTempStartDate] = useState<string>(initialRange.start);
  const [tempEndDate, setTempEndDate] = useState<string>(initialRange.end);
  const [tempSelectedFacilityIds, setTempSelectedFacilityIds] = useState<string[]>([]);
  const [tempSelectedHotelIds, setTempSelectedHotelIds] = useState<string[]>([]);

  // Synchronize temp start & end when tempRangeType changes
  useEffect(() => {
    if (tempRangeType !== 'custom') {
      const { start, end } = getInitialRange(tempRangeType);
      setTempStartDate(start);
      setTempEndDate(end);
    }
  }, [tempRangeType]);

  // Apply button handler
  const handleApplyReport = () => {
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setRangeType(tempRangeType);
    setSelectedFacilityIds(tempSelectedFacilityIds);
    setSelectedHotelIds(tempSelectedHotelIds);
  };

  // Change detection for the "Raporla" button
  const hasChangesToApply = useMemo(() => {
    return tempStartDate !== startDate ||
      tempEndDate !== endDate ||
      tempRangeType !== rangeType ||
      JSON.stringify(tempSelectedFacilityIds) !== JSON.stringify(selectedFacilityIds) ||
      JSON.stringify(tempSelectedHotelIds) !== JSON.stringify(selectedHotelIds);
  }, [tempStartDate, startDate, tempEndDate, endDate, tempRangeType, rangeType, tempSelectedFacilityIds, selectedFacilityIds, tempSelectedHotelIds, selectedHotelIds]);

  // Dynamic Security Guards & RBAC Filtering
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

  // Active user dropdown states
  const [facilityDropdownOpen, setFacilityDropdownOpen] = useState(false);
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);

  // Dynamically allowed facility/dorm IDs
  const allowedDormIds = useMemo(() => {
    const baseIds = availableFacilities.map(f => f.id);
    if (selectedFacilityIds.length === 0) {
      return baseIds;
    }
    return baseIds.filter(id => selectedFacilityIds.includes(id));
  }, [availableFacilities, selectedFacilityIds]);

  // Dynamically allowed staff
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

    if (selectedHotelIds.length === 0) {
      return baseStaff;
    }
    return baseStaff.filter(s => selectedHotelIds.includes(s.hotelId));
  }, [staff, hasFullAccess, currentUser, userHotelIds, availableFacilities, accommodations, selectedHotelIds]);

  // Geceleme ve Hareketlilik (Turnover) Analizleri
  const {
    personNights,
    roomNights,
    checkInsCount,
    checkOutsCount,
    trendData,
    isDaily
  } = useMemo(() => {
    if (!startDate || !endDate) {
      return { personNights: 0, roomNights: 0, checkInsCount: 0, checkOutsCount: 0, trendData: [], isDaily: true };
    }

    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    const diffDays = getDaysDiff(start, end);
    const isDaily = diffDays <= 35;

    const dayDates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const yStr = current.getFullYear();
      const mStr = String(current.getMonth() + 1).padStart(2, '0');
      const dStr = String(current.getDate()).padStart(2, '0');
      dayDates.push(`${yStr}-${mStr}-${dStr}`);
      current.setDate(current.getDate() + 1);
    }

    const activeAndPastAccs = accommodations.filter(a => allowedDormIds.includes(a.facilityId));

    const accWithNights = activeAndPastAccs.map(acc => {
      const endLimit = acc.checkOutDate || todayStr;
      const overlapNights = getOccupiedNightsForAcc(acc.checkInDate, endLimit, startDate, endDate);
      return {
        acc,
        nights: overlapNights
      };
    });

    const allowedStaffIds = new Set(allowedStaff.map(s => s.id));

    let totalPersonNights = 0;
    accWithNights.forEach(item => {
      const isAllowedStaff = allowedStaffIds.has(item.acc.staffId);
      if (isAllowedStaff) {
        totalPersonNights += item.nights.length;
      }
    });

    let totalRoomNights = 0;
    const authorizedRooms = rooms.filter(r => allowedDormIds.includes(r.facilityId));
    
    const roomOccupiedNights: Record<string, Set<string>> = {};
    authorizedRooms.forEach(r => {
      roomOccupiedNights[r.id] = new Set<string>();
    });

    accWithNights.forEach(item => {
      const roomId = item.acc.roomId;
      if (roomOccupiedNights[roomId]) {
        item.nights.forEach(day => {
          roomOccupiedNights[roomId].add(day);
        });
      }
    });

    Object.values(roomOccupiedNights).forEach(set => {
      totalRoomNights += set.size;
    });

    const checkIns = activeAndPastAccs.filter(a => {
      const inRange = a.checkInDate >= startDate && a.checkInDate <= endDate;
      const isAllowedStaff = allowedStaffIds.has(a.staffId);
      return inRange && isAllowedStaff;
    }).length;

    const checkOuts = activeAndPastAccs.filter(a => {
      const isCheckedOut = a.status === 'checked_out' && a.checkOutDate;
      const outInRange = isCheckedOut && a.checkOutDate! >= startDate && a.checkOutDate! <= endDate;
      const isAllowedStaff = allowedStaffIds.has(a.staffId);
      return outInRange && isAllowedStaff;
    }).length;

    // Fast-path lookup maps for day-specific stats
    const dayPersonNightsMap: Record<string, number> = {};
    const dayRoomNightsMap: Record<string, Set<string>> = {};
    const dayCheckInsMap: Record<string, number> = {};
    const dayCheckOutsMap: Record<string, number> = {};

    dayDates.forEach(day => {
      dayPersonNightsMap[day] = 0;
      dayRoomNightsMap[day] = new Set<string>();
      dayCheckInsMap[day] = 0;
      dayCheckOutsMap[day] = 0;
    });

    accWithNights.forEach(item => {
      const isAllowedStaff = allowedStaffIds.has(item.acc.staffId);
      const roomId = item.acc.roomId;

      item.nights.forEach(day => {
        if (dayPersonNightsMap[day] !== undefined) {
          if (isAllowedStaff) {
            dayPersonNightsMap[day]++;
          }
          dayRoomNightsMap[day].add(roomId);
        }
      });
    });

    activeAndPastAccs.forEach(a => {
      const isAllowedStaff = allowedStaffIds.has(a.staffId);
      if (isAllowedStaff) {
        if (a.checkInDate && dayCheckInsMap[a.checkInDate] !== undefined) {
          dayCheckInsMap[a.checkInDate]++;
        }
        if (a.status === 'checked_out' && a.checkOutDate && dayCheckOutsMap[a.checkOutDate] !== undefined) {
          dayCheckOutsMap[a.checkOutDate]++;
        }
      }
    });

    const dailyStats = dayDates.map(day => {
      return {
        day,
        personNights: dayPersonNightsMap[day] || 0,
        roomNights: dayRoomNightsMap[day]?.size || 0,
        checkIns: dayCheckInsMap[day] || 0,
        checkOuts: dayCheckOutsMap[day] || 0
      };
    });

    let trendData: any[] = [];
    if (isDaily) {
      trendData = dailyStats.map(s => {
        const dateObj = parseDateString(s.day);
        const name = `${dateObj.getDate()} ${dateObj.toLocaleDateString('tr-TR', { month: 'short' })}`;
        return {
          name,
          "Kişi Geceleme": s.personNights,
          "Oda Geceleme": s.roomNights,
          "Giriş Yapan": s.checkIns,
          "Çıkış Yapan": s.checkOuts
        };
      });
    } else {
      const monthlyGroups: Record<string, typeof dailyStats> = {};
      dailyStats.forEach(s => {
        const monthKey = s.day.substring(0, 7);
        if (!monthlyGroups[monthKey]) monthlyGroups[monthKey] = [];
        monthlyGroups[monthKey].push(s);
      });

      const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

      trendData = Object.entries(monthlyGroups).map(([monthKey, statsList]) => {
        const [y, m] = monthKey.split('-').map(Number);
        const name = `${monthNames[m - 1]} ${y}`;
        
        const sumPersonNights = statsList.reduce((sum, s) => sum + s.personNights, 0);
        const sumRoomNights = statsList.reduce((sum, s) => sum + s.roomNights, 0);
        const sumCheckIns = statsList.reduce((sum, s) => sum + s.checkIns, 0);
        const sumCheckOuts = statsList.reduce((sum, s) => sum + s.checkOuts, 0);

        return {
          name,
          "Kişi Geceleme": sumPersonNights,
          "Oda Geceleme": sumRoomNights,
          "Giriş Yapan": sumCheckIns,
          "Çıkış Yapan": sumCheckOuts
        };
      });
    }

    return {
      personNights: totalPersonNights,
      roomNights: totalRoomNights,
      checkInsCount: checkIns,
      checkOutsCount: checkOuts,
      trendData,
      isDaily
    };
  }, [startDate, endDate, accommodations, allowedStaff, rooms, allowedDormIds, todayStr]);

  // Dynamic selection boundaries based on filters
  const visibleFacilities = useMemo(() => {
    if (selectedFacilityIds.length === 0) {
      return availableFacilities;
    }
    return availableFacilities.filter(f => selectedFacilityIds.includes(f.id));
  }, [availableFacilities, selectedFacilityIds]);

  const visibleHotels = useMemo(() => {
    if (selectedHotelIds.length === 0) {
      return availableHotels;
    }
    return availableHotels.filter(h => selectedHotelIds.includes(h.id));
  }, [availableHotels, selectedHotelIds]);

  // Professional Excel Exporter
  const handleExportExcel = () => {
    if (!can(currentUser?.role, 'export_excel', PAGE_KEYS.reports, rolesPermissions)) return;

    const wb = XLSX.utils.book_new();
    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    const daysCount = getDaysDiff(start, end) + 1;

    // Tab 1: Özet (Summary)
    const summaryData = [
      ["CORBIT HR - LOJMAN YÖNETİM SİSTEMİ", ""],
      ["DÖNEMSEL VE PERFORMANS RAPORLARI ÖZETİ", ""],
      ["Oluşturulma Tarihi", new Date().toLocaleString("tr-TR")],
      ["Filtre Tarih Aralığı", `${startDate} - ${endDate} (${daysCount} Gün)`],
      [],
      ["Metrik Adı", "Hesaplanan Değer", "Açıklama"],
      ["Toplam Kişi Geceleme (Person Nights)", personNights, "Seçili tarih aralüğında, yetkili olunan personellerin lojmanda geçirdiği toplam gece sayısı"],
      ["Toplam Oda Geceleme (Room Nights)", roomNights, "Seçili tarih aralığında, odaların en az 1 kişi tarafından işgal edildiği mükerrersiz gece sayısı"],
      ["Dönemlik Toplam Giriş (Check-In)", checkInsCount, "Seçilen tarih aralığında lojmana yerleştirilen personel sayısı"],
      ["Dönemlik Toplam Çıkış (Check-Out)", checkOutsCount, "Seçilen tarih aralığında lojmandan çıkış yapan personel sayısı"],
      ["Mevcut Toplam Oda Sayısı", rooms.filter(r => allowedDormIds.includes(r.facilityId)).length, "Yetki alanındaki toplam oda sayısı"],
      ["Aktif Yatak Kapasitesi", rooms.filter(r => allowedDormIds.includes(r.facilityId) && r.status === "active").reduce((s, r) => s + r.bedCount, 0), "Aktif durumdaki odalardaki yatak kapasitesi"]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Rapor Özeti");

    // Compute detailed period matrices
    const excelMatrix: Record<string, Record<string, {
      personNights: number;
      roomNightsSet: Set<string>;
      uniqueStaffSet: Set<string>;
      uniqueRoomsSet: Set<string>;
    }>> = {};

    visibleFacilities.forEach(f => {
      excelMatrix[f.id] = {};
      visibleHotels.forEach(h => {
        excelMatrix[f.id][h.id] = {
          personNights: 0,
          roomNightsSet: new Set<string>(),
          uniqueStaffSet: new Set<string>(),
          uniqueRoomsSet: new Set<string>()
        };
      });
    });

    accommodations.forEach(acc => {
      if (!excelMatrix[acc.facilityId]) return;
      const s = staff.find(st => st.id === acc.staffId);
      if (!s || !excelMatrix[acc.facilityId][s.hotelId]) return;

      const hId = s.hotelId;
      const fId = acc.facilityId;
      const rId = acc.roomId;

      const endLimit = acc.checkOutDate || todayStr;
      const overlapNights = getOccupiedNightsForAcc(acc.checkInDate, endLimit, startDate, endDate);

      excelMatrix[fId][hId].personNights += overlapNights.length;
      overlapNights.forEach(day => {
        excelMatrix[fId][hId].roomNightsSet.add(`${rId}_${day}`);
      });
      if (overlapNights.length > 0) {
        excelMatrix[fId][hId].uniqueStaffSet.add(s.id);
        excelMatrix[fId][hId].uniqueRoomsSet.add(rId);
      }
    });

    // Helper to generate a matrix sheet
    const makeGridSheet = (title: string, metricGetter: (fId: string, hId: string) => number) => {
      const headers = ["Lojman Adı", ...visibleHotels.map(h => h.branchCode || h.name), "Toplam"];
      const rows = visibleFacilities.map(f => {
        let rowTotal = 0;
        const cols = visibleHotels.map(h => {
          const val = metricGetter(f.id, h.id);
          rowTotal += val;
          return val;
        });
        return [f.name, ...cols, rowTotal];
      });

      const colTotals = visibleHotels.map(h => {
        return visibleFacilities.reduce((sum, f) => sum + metricGetter(f.id, h.id), 0);
      });
      const grandTotal = colTotals.reduce((a, b) => a + b, 0);
      const totalsRow = ["Genel Toplam", ...colTotals, grandTotal];

      return XLSX.utils.aoa_to_sheet([
        [title],
        [`Dönem: ${startDate} - ${endDate} (${daysCount} Gün)`],
        [],
        headers,
        ...rows,
        totalsRow
      ]);
    };

    // Tab 2: Maliyet Dağılımı (Cost Apportionment)
    const costSheetData: any[][] = [
      ["CORBIT HR - LOJMAN MALİYET PAYLAŞIM VE DAĞITIM RAPORU"],
      [`DÖNEM: ${startDate} - ${endDate} (${daysCount} Gün)`],
      ["Oluşturulma Tarihi", new Date().toLocaleString("tr-TR")],
      [],
      ["1. STRATEJİ: KİŞİ GECELEME ESASLI DAĞITIM (Yatak Gecelik 250 ₺)"],
      ["Lojman Adı", "Gecelik Bedel", "Toplam Gece", "Toplam Maliyet", ...visibleHotels.map(h => `${h.name} Payı (₺)`), ...visibleHotels.map(h => `${h.name} Oranı (%)`)]
    ];

    const defaultBedCost = 250;
    let totalKisiCostAll = 0;
    const kisiHotelTotalsCost: Record<string, number> = {};
    visibleHotels.forEach(h => { kisiHotelTotalsCost[h.id] = 0; });

    visibleFacilities.forEach(f => {
      const personNightsTotal = visibleHotels.reduce((sum, h) => sum + excelMatrix[f.id][h.id].personNights, 0);
      const totalCost = personNightsTotal * defaultBedCost;
      totalKisiCostAll += totalCost;

      const hotelCosts = visibleHotels.map(h => {
        const cost = excelMatrix[f.id][h.id].personNights * defaultBedCost;
        kisiHotelTotalsCost[h.id] += cost;
        return cost;
      });

      const hotelPercentages = visibleHotels.map(h => {
        const nights = excelMatrix[f.id][h.id].personNights;
        return personNightsTotal > 0 ? `${((nights / personNightsTotal) * 100).toFixed(1)}%` : "0.0%";
      });

      costSheetData.push([f.name, defaultBedCost, personNightsTotal, totalCost, ...hotelCosts, ...hotelPercentages]);
    });

    costSheetData.push([
      "Genel Toplam",
      "-",
      visibleFacilities.reduce((sum, f) => sum + visibleHotels.reduce((s, h) => s + excelMatrix[f.id][h.id].personNights, 0), 0),
      totalKisiCostAll,
      ...visibleHotels.map(h => kisiHotelTotalsCost[h.id]),
      ...visibleHotels.map(h => totalKisiCostAll > 0 ? `${((kisiHotelTotalsCost[h.id] / totalKisiCostAll) * 100).toFixed(1)}%` : "0.0%")
    ]);

    costSheetData.push(
      [],
      [],
      ["2. STRATEJİ: ODA GECELEME ESASLI DAĞITIM (Oda Gecelik 600 ₺)"],
      ["Lojman Adı", "Gecelik Bedel", "Toplam Gece", "Toplam Maliyet", ...visibleHotels.map(h => `${h.name} Payı (₺)`), ...visibleHotels.map(h => `${h.name} Oranı (%)`)]
    );

    const defaultRoomCost = 600;
    let totalOdaCostAll = 0;
    const odaHotelTotalsCost: Record<string, number> = {};
    visibleHotels.forEach(h => { odaHotelTotalsCost[h.id] = 0; });

    visibleFacilities.forEach(f => {
      const fRoomNightsSet = new Set<string>();
      visibleHotels.forEach(h => {
        excelMatrix[f.id][h.id].roomNightsSet.forEach(key => fRoomNightsSet.add(key));
      });
      const roomNightsTotal = fRoomNightsSet.size;
      const totalCost = roomNightsTotal * defaultRoomCost;
      totalOdaCostAll += totalCost;

      const hotelCosts = visibleHotels.map(h => {
        const cost = excelMatrix[f.id][h.id].roomNightsSet.size * defaultRoomCost;
        odaHotelTotalsCost[h.id] += cost;
        return cost;
      });

      const hotelPercentages = visibleHotels.map(h => {
        const nights = excelMatrix[f.id][h.id].roomNightsSet.size;
        return roomNightsTotal > 0 ? `${((nights / roomNightsTotal) * 100).toFixed(1)}%` : "0.0%";
      });

      costSheetData.push([f.name, defaultRoomCost, roomNightsTotal, totalCost, ...hotelCosts, ...hotelPercentages]);
    });

    costSheetData.push([
      "Genel Toplam",
      "-",
      visibleFacilities.reduce((sum, f) => {
        const fRoomNightsSet = new Set<string>();
        visibleHotels.forEach(h => {
          excelMatrix[f.id][h.id].roomNightsSet.forEach(key => fRoomNightsSet.add(key));
        });
        return sum + fRoomNightsSet.size;
      }, 0),
      totalOdaCostAll,
      ...visibleHotels.map(h => odaHotelTotalsCost[h.id]),
      ...visibleHotels.map(h => totalOdaCostAll > 0 ? `${((odaHotelTotalsCost[h.id] / totalOdaCostAll) * 100).toFixed(1)}%` : "0.0%")
    ]);

    const wsMaliyet = XLSX.utils.aoa_to_sheet(costSheetData);
    XLSX.utils.book_append_sheet(wb, wsMaliyet, "Maliyet Paylaşım Analizi");

    // Append Usage Matrix Sheets
    const wsKisiGeceleme = makeGridSheet("LOJMAN - OTEL KİŞİ GECELEME MATRİSİ", (fId, hId) => excelMatrix[fId][hId].personNights);
    XLSX.utils.book_append_sheet(wb, wsKisiGeceleme, "Kişi Geceleme Matrisi");

    const wsOdaGeceleme = makeGridSheet("LOJMAN - OTEL ODA GECELEME MATRİSİ", (fId, hId) => excelMatrix[fId][hId].roomNightsSet.size);
    XLSX.utils.book_append_sheet(wb, wsOdaGeceleme, "Oda Geceleme Matrisi");

    const wsToplamKisi = makeGridSheet("LOJMAN - OTEL BENZERSİZ KONAKLAYAN KİŞİ MATRİSİ", (fId, hId) => excelMatrix[fId][hId].uniqueStaffSet.size);
    XLSX.utils.book_append_sheet(wb, wsToplamKisi, "Benzersiz Kişi Matrisi");

    const wsToplamOda = makeGridSheet("LOJMAN - OTEL BENZERSİZ KULLANILAN ODA MATRİSİ", (fId, hId) => excelMatrix[fId][hId].uniqueRoomsSet.size);
    XLSX.utils.book_append_sheet(wb, wsToplamOda, "Benzersiz Oda Matrisi");

    // Tab: Lojman Oda Detayları
    const roomDetailsHeaders = ["Oda No", "Lojman Adı", "Kapasite (Yatak)", "Aktif Kişi Sayısı", "Dönemlik İşgal Edilen Gece Sayısı", "Doluluk Oranı (%)", "Oda Durumu"];
    const authorizedRooms = rooms.filter(r => allowedDormIds.includes(r.facilityId));
    const activeAccsFiltered = accommodations.filter(a => a.status === 'active' && allowedDormIds.includes(a.facilityId));

    const roomDetailsRows = authorizedRooms.map(r => {
      const roomAccs = activeAccsFiltered.filter(a => a.roomId === r.id);
      const facName = facilities.find(f => f.id === r.facilityId)?.name || 'Bilinmeyen';
      
      const endLimit = todayStr;
      const roomAccsHistory = accommodations.filter(a => a.roomId === r.id);
      const occupiedSet = new Set<string>();
      roomAccsHistory.forEach(acc => {
        const overlap = getOccupiedNightsForAcc(acc.checkInDate, acc.checkOutDate || endLimit, startDate, endDate);
        overlap.forEach(d => occupiedSet.add(d));
      });

      return [
        r.roomNumber,
        facName,
        r.bedCount,
        roomAccs.length,
        occupiedSet.size,
        r.bedCount > 0 ? `${((roomAccs.length / r.bedCount) * 100).toFixed(1)}%` : "0.0%",
        r.status === "active" ? "Aktif" : r.status === "maintenance" ? "Bakımda" : "Pasif"
      ];
    });

    const wsOda = XLSX.utils.aoa_to_sheet([["ODA GECELEME VE KAPASİTE ANALİZİ"], [], roomDetailsHeaders, ...roomDetailsRows]);
    XLSX.utils.book_append_sheet(wb, wsOda, "Lojman Oda Detayları");

    // Tab: Arızalar
    const activeTickets = maintenanceTickets.filter(t => allowedDormIds.includes(t.dormId));
    if (activeTickets.length > 0) {
      const ticketsHeaders = ["Arıza Başlığı", "Açıklama", "Lojman Adı", "Oda No", "Öncelik", "Durum", "Bildiren Personel", "Açılış Tarihi"];
      const ticketsRows = activeTickets.map(t => [
        t.title,
        t.description,
        facilities.find(f => f.id === t.dormId)?.name || t.dormId,
        rooms.find(r => r.id === t.roomId)?.roomNumber || '-',
        t.priority,
        t.status,
        t.reportedBy,
        new Date(t.createdAt).toLocaleDateString("tr-TR")
      ]);

      const wsArizalar = XLSX.utils.aoa_to_sheet([["LOJMAN AKTİF ARIZA VE BAKIM RAPORU"], [], ticketsHeaders, ...ticketsRows]);
      XLSX.utils.book_append_sheet(wb, wsArizalar, "Arıza ve Teknik Durum");
    }

    // Write file
    XLSX.writeFile(wb, `Corbit_HR_Donemsel_Rapor_${startDate}_to_${endDate}.xlsx`);
  };

  // RBAC Security Gate Check
  if (!canViewPage(currentUser?.role, PAGE_KEYS.reports, rolesPermissions)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-stone-500">
        <ShieldAlert className="w-16 h-16 mb-4 text-red-500 opacity-20" />
        <h2 className="text-2xl font-bold text-stone-700">Yetkisiz Erişim</h2>
        <p>Bu sayfayı görüntüleme yetkiniz yok. Yönetici ile iletişime geçin.</p>
      </div>
    );
  }

  const isExcelExportAllowed = can(currentUser?.role, 'export_excel', PAGE_KEYS.reports, rolesPermissions);

  return (
    <div className="w-full flex flex-col p-6 space-y-8">
      {/* Page Header */}
      <PageHeader 
        title="Dönemsel Raporlama & Analiz"
        description="Lojman doluluk trendleri, geceleme istatistikleri ve performans KPI'ları."
        actions={[
          refreshAction,
          ...(isExcelExportAllowed ? [{
            key: 'download_report',
            icon: Download,
            tooltip: 'Excel Raporu İndir',
            onClick: handleExportExcel,
            colorClass: 'bg-[#7C8363] text-white border-transparent hover:bg-[#6A7054] px-4'
          }] : [])
        ]}
      />

      {/* Consolidated Filter Box */}
      <div className="bg-[#FAF9F6] border border-stone-200/60 p-5 rounded-2xl flex flex-col gap-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#7C8363]/10 text-[#7C8363] rounded-xl shrink-0">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#2D332D]">Raporlama Kriterleri</h3>
              <p className="text-xs text-stone-500">Tarih, lojman ve otel seçimlerini yaptıktan sonra "Raporla" butonuyla verileri güncelleyebilirsiniz.</p>
            </div>
          </div>

          {/* Raporla Button */}
          <button
            type="button"
            onClick={handleApplyReport}
            className={cn(
              "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm shrink-0 border",
              hasChangesToApply 
                ? "bg-[#7C8363] hover:bg-[#6A7054] text-white border-transparent ring-2 ring-[#7C8363]/20 animate-pulse"
                : "bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200"
            )}
          >
            <Activity className="w-4 h-4" />
            Raporla (Raporu Oluştur)
            {hasChangesToApply && (
              <span className="ml-1 px-1.5 py-0.5 bg-white text-[#7C8363] font-extrabold text-[9px] rounded-md uppercase">
                Güncelle
              </span>
            )}
          </button>
        </div>

        {/* 3 Column Selector Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Column 1: Date Presets & Custom dates */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400">Dönem Seçimi</label>
            <div className="flex bg-stone-100 p-1 rounded-xl w-full border border-stone-200/50">
              <button
                type="button"
                onClick={() => setTempRangeType('this_month')}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all",
                  tempRangeType === 'this_month'
                    ? "bg-white text-[#2D332D] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                Bu Ay
              </button>
              <button
                type="button"
                onClick={() => setTempRangeType('last_month')}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all",
                  tempRangeType === 'last_month'
                    ? "bg-white text-[#2D332D] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                Geçen Ay
              </button>
              <button
                type="button"
                onClick={() => setTempRangeType('ytd')}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all",
                  tempRangeType === 'ytd'
                    ? "bg-white text-[#2D332D] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                YTD
              </button>
              <button
                type="button"
                onClick={() => setTempRangeType('custom')}
                className={cn(
                  "flex-1 text-center py-1.5 text-xs font-semibold rounded-lg transition-all",
                  tempRangeType === 'custom'
                    ? "bg-white text-[#2D332D] shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                )}
              >
                Özel
              </button>
            </div>

            {tempRangeType === 'custom' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#7C8363] focus:ring-2 focus:ring-[#7C8363]/10"
                />
                <span className="text-stone-400 text-xs shrink-0">to</span>
                <input
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#7C8363] focus:ring-2 focus:ring-[#7C8363]/10"
                />
              </div>
            )}
          </div>

          {/* Column 2: Lojman Filtresi */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Lojman Filtresi</label>
            <button
              type="button"
              onClick={() => {
                setFacilityDropdownOpen(!facilityDropdownOpen);
                setHotelDropdownOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-3 w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:border-stone-300 shadow-sm transition-all text-left",
                facilityDropdownOpen && "border-[#7C8363] ring-2 ring-[#7C8363]/10"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Building className="w-4 h-4 text-[#7C8363] shrink-0" />
                <span className="truncate">
                  {tempSelectedFacilityIds.length === 0 
                    ? 'Tüm Lojmanlar (Filtresiz)' 
                    : `${tempSelectedFacilityIds.length} Lojman Seçili`}
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform shrink-0", facilityDropdownOpen && "rotate-180")} />
            </button>

            {facilityDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setFacilityDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                  <div className="p-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">Lojman Seçimi ({availableFacilities.length})</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTempSelectedFacilityIds(availableFacilities.map(f => f.id))}
                        className="text-[10px] font-bold text-[#7C8363] hover:underline"
                      >
                        Tümü
                      </button>
                      <span className="text-stone-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() => setTempSelectedFacilityIds([])}
                        className="text-[10px] font-bold text-stone-400 hover:underline"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {availableFacilities.map((f) => {
                      const isChecked = tempSelectedFacilityIds.includes(f.id);
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setTempSelectedFacilityIds(tempSelectedFacilityIds.filter(id => id !== f.id));
                            } else {
                              setTempSelectedFacilityIds([...tempSelectedFacilityIds, f.id]);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-medium transition-colors hover:bg-stone-50",
                            isChecked && "bg-[#7C8363]/5 text-[#2D332D]"
                          )}
                        >
                          <span className="truncate">{f.name}</span>
                          {isChecked && <Check className="w-4 h-4 text-[#7C8363]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Column 3: Otel Filtresi */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Otel Filtresi</label>
            <button
              type="button"
              onClick={() => {
                setHotelDropdownOpen(!hotelDropdownOpen);
                setFacilityDropdownOpen(false);
              }}
              className={cn(
                "flex items-center justify-between gap-3 w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 hover:border-stone-300 shadow-sm transition-all text-left",
                hotelDropdownOpen && "border-[#7C8363] ring-2 ring-[#7C8363]/10"
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-4 h-4 text-[#7C8363] shrink-0" />
                <span className="truncate">
                  {tempSelectedHotelIds.length === 0 
                    ? 'Tüm Oteller (Filtresiz)' 
                    : `${tempSelectedHotelIds.length} Otel Seçili`}
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform shrink-0", hotelDropdownOpen && "rotate-180")} />
            </button>

            {hotelDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setHotelDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-72 bg-white border border-stone-200 rounded-2xl shadow-xl z-30 overflow-hidden">
                  <div className="p-3 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600">Otel Seçimi ({availableHotels.length})</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTempSelectedHotelIds(availableHotels.map(h => h.id))}
                        className="text-[10px] font-bold text-[#7C8363] hover:underline"
                      >
                        Tümü
                      </button>
                      <span className="text-stone-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={() => setTempSelectedHotelIds([])}
                        className="text-[10px] font-bold text-stone-400 hover:underline"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {availableHotels.map((h) => {
                      const isChecked = tempSelectedHotelIds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setTempSelectedHotelIds(tempSelectedHotelIds.filter(id => id !== h.id));
                            } else {
                              setTempSelectedHotelIds([...tempSelectedHotelIds, h.id]);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-medium transition-colors hover:bg-stone-50",
                            isChecked && "bg-[#7C8363]/5 text-[#2D332D]"
                          )}
                        >
                          <div className="flex flex-col text-left truncate">
                            <span className="truncate">{h.name}</span>
                            {h.branchCode && <span className="text-[9px] text-stone-400 font-mono">{h.branchCode}</span>}
                          </div>
                          {isChecked && <Check className="w-4 h-4 text-[#7C8363]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active/Unapplied Filter Chips & Reset */}
        {(tempSelectedFacilityIds.length > 0 || tempSelectedHotelIds.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-3.5 border-t border-stone-200/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">Süzgeç Kriterleri:</span>
            
            {tempSelectedFacilityIds.map(id => {
              const name = availableFacilities.find(f => f.id === id)?.name || id;
              return (
                <div key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7C8363]/10 text-[#7C8363] rounded-xl text-xs font-medium transition-all hover:bg-[#7C8363]/15">
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => setTempSelectedFacilityIds(tempSelectedFacilityIds.filter(fid => fid !== id))}
                    className="hover:bg-[#7C8363]/20 p-0.5 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {tempSelectedHotelIds.map(id => {
              const name = availableHotels.find(h => h.id === id)?.name || id;
              return (
                <div key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-200 text-stone-800 rounded-xl text-xs font-medium transition-all hover:bg-stone-300/60">
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => setTempSelectedHotelIds(tempSelectedHotelIds.filter(hid => hid !== id))}
                    className="hover:bg-stone-300 p-0.5 rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setTempSelectedFacilityIds([]);
                setTempSelectedHotelIds([]);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 transition-colors pl-2"
            >
              Kriterleri Sıfırla
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Person Nights */}
        <div className="card-standard p-5 flex items-center justify-between bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Kişi Geceleme (Person Nights)</p>
            <div className="text-3xl font-serif font-bold text-[#2D332D] mt-2">{personNights.toLocaleString('tr-TR')}</div>
            <p className="text-[10px] text-stone-500 mt-1">Dönemlik toplam gece konaklama sayısı</p>
          </div>
          <div className="p-3 bg-[#7C8363]/10 text-[#7C8363] rounded-xl shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Room Nights */}
        <div className="card-standard p-5 flex items-center justify-between bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Oda Geceleme (Room Nights)</p>
            <div className="text-3xl font-serif font-bold text-[#2D332D] mt-2">{roomNights.toLocaleString('tr-TR')}</div>
            <p className="text-[10px] text-stone-500 mt-1">Mükerrersiz oda işgal gece sayısı</p>
          </div>
          <div className="p-3 bg-[#2D332D]/10 text-[#2D332D] rounded-xl shrink-0">
            <BedDouble className="w-6 h-6" />
          </div>
        </div>

        {/* Check-ins */}
        <div className="card-standard p-5 flex items-center justify-between bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Giriş Yapan (Check-In)</p>
            <div className="text-3xl font-serif font-bold text-emerald-600 mt-2">+{checkInsCount.toLocaleString('tr-TR')}</div>
            <p className="text-[10px] text-stone-500 mt-1">Dönem içinde yerleşen personel</p>
          </div>
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        {/* Check-outs */}
        <div className="card-standard p-5 flex items-center justify-between bg-white border border-stone-200 rounded-2xl shadow-sm">
          <div>
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Çıkış Yapan (Check-Out)</p>
            <div className="text-3xl font-serif font-bold text-rose-600 mt-2">-{checkOutsCount.toLocaleString('tr-TR')}</div>
            <p className="text-[10px] text-stone-500 mt-1">Dönem içinde ayrılan personel</p>
          </div>
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
            <ArrowDownRight className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Otel-Lojman Kullanım Matrisi */}
      <PeriodMatrixSection
        accommodations={accommodations}
        staff={staff}
        hotels={hotels}
        facilities={facilities}
        rooms={rooms}
        startDate={startDate}
        endDate={endDate}
        todayStr={todayStr}
        visibleFacilities={visibleFacilities}
        visibleHotels={visibleHotels}
        handleExportExcel={handleExportExcel}
      />

      {/* Forecast Line Chart and Table */}
      <TrendSection 
        trendData={trendData}
        isDaily={isDaily}
        startDate={startDate}
        endDate={endDate}
      />

      <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-stone-700 space-y-4">
        <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#7C8363]" />
          Raporlama Bilgisi ve Veri Analitiği Hakkında
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-stone-600 leading-relaxed">
          <div className="space-y-3">
            <p>
              <strong className="text-stone-800 font-semibold">Kişi Geceleme (Person Nights):</strong> Yetkili olduğunuz personellerin seçilen tarih aralığında, yerleştirilmiş olduğu lojmanlarda geçirdiği toplam gece sayısıdır. Eğer bir personel seçilen tarihten önce giriş yapmışsa, başlangıç tarihi süzgeç başlangıcından itibaren hesaplanır.
            </p>
            <p>
              <strong className="text-stone-800 font-semibold">Oda Geceleme (Room Nights):</strong> Belirlenen tarih aralığında, odalarınızın en az bir personel tarafından işgal edildiği mükerrersiz gün sayısıdır. Bu metrik, fiziksel odaların ısıtma, soğutma ve bakım maliyetlerini hesaplamak için kritik bir doluluk verisidir.
            </p>
          </div>
          <div className="space-y-3">
            <p>
              <strong className="text-stone-800 font-semibold">Giriş / Çıkış Hacmi:</strong> Belirtilen döneme ait sirkülasyonu (turnover) gösterir. Yüksek giriş/çıkış hacmi, departmanların iş gücü sirkülasyonunu ve lojman operasyonunun temizlik/hazırlık yükünü yansıtır.
            </p>
            <p>
              <strong className="text-stone-800 font-semibold">Granüler Yetkilendirme:</strong> Bu sayfadaki tüm performans metrikleri, grafikler ve Excel çıktıları tamamen kullanıcının yetkilendirildiği tesis ve oteller sınırında derlenir. Super adminler tüm zincir verisini görebilirken, Otel yöneticileri sadece kendi otel kadrolarını, Lojman yöneticileri ise sadece kendi lojmanlarındaki hareketleri izleyebilir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
