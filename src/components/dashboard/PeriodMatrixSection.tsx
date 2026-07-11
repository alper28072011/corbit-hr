import React, { useState, useMemo } from "react";
import { 
  TrendingUp, 
  Calculator, 
  Bed, 
  FileSpreadsheet,
  Info
} from "lucide-react";
import { motion } from "motion/react";
import { Accommodation, Staff, Hotel, Facility, Room } from "../../types";

interface PeriodMatrixSectionProps {
  accommodations: Accommodation[];
  staff: Staff[];
  hotels: Hotel[];
  facilities: Facility[];
  rooms: Room[];
  startDate: string;
  endDate: string;
  todayStr: string;
  visibleFacilities: Facility[];
  visibleHotels: Hotel[];
  handleExportExcel: () => void;
}

type MetricType = 'person_nights' | 'avg_occupants' | 'unique_staff' | 'room_nights' | 'avg_rooms' | 'unique_rooms';

export default function PeriodMatrixSection({
  accommodations,
  staff,
  hotels,
  facilities,
  rooms,
  startDate,
  endDate,
  todayStr,
  visibleFacilities,
  visibleHotels,
  handleExportExcel
}: PeriodMatrixSectionProps) {
  // Usage Matrix Metric State
  const [activeMetric, setActiveMetric] = useState<MetricType>('person_nights');

  // Date Helpers local implementation
  const parseDateString = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getDaysDiff = (d1: Date, d2: Date): number => {
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  };

  const getOccupiedNightsForAcc = (
    checkInStr: string,
    checkOutStr: string,
    filterStartStr: string,
    filterEndStr: string
  ): string[] => {
    const nights: string[] = [];
    
    const checkIn = parseDateString(checkInStr);
    const checkOut = parseDateString(checkOutStr);
    const filterStart = parseDateString(filterStartStr);
    const filterEnd = parseDateString(filterEndStr);
    
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
  };

  // Compute Period Matrix Data
  const data = useMemo(() => {
    if (!startDate || !endDate || visibleFacilities.length === 0 || visibleHotels.length === 0) {
      return {
        matrix: {},
        facilityTotals: {},
        hotelTotals: {},
        grandTotals: {
          personNights: 0,
          roomNights: 0,
          uniqueStaffCount: 0,
          uniqueRoomsCount: 0
        },
        daysCount: 1
      };
    }

    const start = parseDateString(startDate);
    const end = parseDateString(endDate);
    const daysCount = getDaysDiff(start, end) + 1; // inclusive

    // Initialize nested records
    const matrix: Record<string, Record<string, {
      personNights: number;
      roomNightsSet: Set<string>; // Set of "roomId_date"
      uniqueStaffSet: Set<string>;
      uniqueRoomsSet: Set<string>;
    }>> = {};

    visibleFacilities.forEach(f => {
      matrix[f.id] = {};
      visibleHotels.forEach(h => {
        matrix[f.id][h.id] = {
          personNights: 0,
          roomNightsSet: new Set<string>(),
          uniqueStaffSet: new Set<string>(),
          uniqueRoomsSet: new Set<string>()
        };
      });
    });

    const staffMap = new Map(staff.map(st => [st.id, st]));

    // Populate data
    accommodations.forEach(acc => {
      if (!matrix[acc.facilityId]) return;

      const s = staffMap.get(acc.staffId);
      if (!s || !matrix[acc.facilityId][s.hotelId]) return;

      const hId = s.hotelId;
      const fId = acc.facilityId;
      const rId = acc.roomId;

      const endLimit = acc.checkOutDate || todayStr;
      const overlapNights = getOccupiedNightsForAcc(acc.checkInDate, endLimit, startDate, endDate);

      // Accumulate
      matrix[fId][hId].personNights += overlapNights.length;
      overlapNights.forEach(day => {
        matrix[fId][hId].roomNightsSet.add(`${rId}_${day}`);
      });
      if (overlapNights.length > 0) {
        matrix[fId][hId].uniqueStaffSet.add(s.id);
        matrix[fId][hId].uniqueRoomsSet.add(rId);
      }
    });

    // Compute Lodging (Facility) Totals
    const facilityTotals: Record<string, {
      personNights: number;
      roomNightsCount: number;
      uniqueStaffCount: number;
      uniqueRoomsCount: number;
    }> = {};

    visibleFacilities.forEach(f => {
      const fRoomNightsSet = new Set<string>();
      const fStaffSet = new Set<string>();
      const fRoomsSet = new Set<string>();
      let fPersonNights = 0;

      visibleHotels.forEach(h => {
        const cell = matrix[f.id][h.id];
        fPersonNights += cell.personNights;
        cell.roomNightsSet.forEach(key => fRoomNightsSet.add(key));
        cell.uniqueStaffSet.forEach(id => fStaffSet.add(id));
        cell.uniqueRoomsSet.forEach(id => fRoomsSet.add(id));
      });

      facilityTotals[f.id] = {
        personNights: fPersonNights,
        roomNightsCount: fRoomNightsSet.size,
        uniqueStaffCount: fStaffSet.size,
        uniqueRoomsCount: fRoomsSet.size
      };
    });

    // Compute Hotel Totals
    const hotelTotals: Record<string, {
      personNights: number;
      roomNightsCount: number;
      uniqueStaffCount: number;
      uniqueRoomsCount: number;
    }> = {};

    visibleHotels.forEach(h => {
      const hRoomNightsSet = new Set<string>();
      const hStaffSet = new Set<string>();
      const hRoomsSet = new Set<string>();
      let hPersonNights = 0;

      visibleFacilities.forEach(f => {
        const cell = matrix[f.id][h.id];
        hPersonNights += cell.personNights;
        cell.roomNightsSet.forEach(key => hRoomNightsSet.add(key));
        cell.uniqueStaffSet.forEach(id => hStaffSet.add(id));
        cell.uniqueRoomsSet.forEach(id => hRoomsSet.add(id));
      });

      hotelTotals[h.id] = {
        personNights: hPersonNights,
        roomNightsCount: hRoomNightsSet.size,
        uniqueStaffCount: hStaffSet.size,
        uniqueRoomsCount: hRoomsSet.size
      };
    });

    // Compute Grand Totals
    const grandRoomNightsSet = new Set<string>();
    const grandStaffSet = new Set<string>();
    const grandRoomsSet = new Set<string>();
    let grandPersonNights = 0;

    visibleFacilities.forEach(f => {
      visibleHotels.forEach(h => {
        const cell = matrix[f.id][h.id];
        grandPersonNights += cell.personNights;
        cell.roomNightsSet.forEach(key => grandRoomNightsSet.add(key));
        cell.uniqueStaffSet.forEach(id => grandStaffSet.add(id));
        cell.uniqueRoomsSet.forEach(id => grandRoomsSet.add(id));
      });
    });

    return {
      matrix,
      facilityTotals,
      hotelTotals,
      grandTotals: {
        personNights: grandPersonNights,
        roomNights: grandRoomNightsSet.size,
        uniqueStaffCount: grandStaffSet.size,
        uniqueRoomsCount: grandRoomsSet.size
      },
      daysCount
    };
  }, [startDate, endDate, accommodations, staff, visibleFacilities, visibleHotels, todayStr]);

  // Helper to extract metric value for a specific cell in the matrix
  const getCellMetricValue = (fId: string, hId: string, type: MetricType): number => {
    const cell = data.matrix[fId]?.[hId];
    if (!cell) return 0;

    switch (type) {
      case 'person_nights':
        return cell.personNights;
      case 'avg_occupants':
        return cell.personNights / data.daysCount;
      case 'unique_staff':
        return cell.uniqueStaffSet.size;
      case 'room_nights':
        return cell.roomNightsSet.size;
      case 'avg_rooms':
        return cell.roomNightsSet.size / data.daysCount;
      case 'unique_rooms':
        return cell.uniqueRoomsSet.size;
      default:
        return 0;
    }
  };

  // Helper to get total metric value for a lodging (row total)
  const getRowMetricTotal = (fId: string, type: MetricType): number => {
    const total = data.facilityTotals[fId];
    if (!total) return 0;

    switch (type) {
      case 'person_nights':
        return total.personNights;
      case 'avg_occupants':
        return total.personNights / data.daysCount;
      case 'unique_staff':
        return total.uniqueStaffCount;
      case 'room_nights':
        return total.roomNightsCount;
      case 'avg_rooms':
        return total.roomNightsCount / data.daysCount;
      case 'unique_rooms':
        return total.uniqueRoomsCount;
      default:
        return 0;
    }
  };

  // Helper to get total metric value for a hotel (column total)
  const getColMetricTotal = (hId: string, type: MetricType): number => {
    const total = data.hotelTotals[hId];
    if (!total) return 0;

    switch (type) {
      case 'person_nights':
        return total.personNights;
      case 'avg_occupants':
        return total.personNights / data.daysCount;
      case 'unique_staff':
        return total.uniqueStaffCount;
      case 'room_nights':
        return total.roomNightsCount;
      case 'avg_rooms':
        return total.roomNightsCount / data.daysCount;
      case 'unique_rooms':
        return total.uniqueRoomsCount;
      default:
        return 0;
    }
  };

  // Helper to get grand total metric value (table total)
  const getGrandMetricTotal = (type: MetricType): number => {
    const total = data.grandTotals;
    if (!total) return 0;

    switch (type) {
      case 'person_nights':
        return total.personNights;
      case 'avg_occupants':
        return total.personNights / data.daysCount;
      case 'unique_staff':
        return total.uniqueStaffCount;
      case 'room_nights':
        return total.roomNights;
      case 'avg_rooms':
        return total.roomNights / data.daysCount;
      case 'unique_rooms':
        return total.uniqueRoomsCount;
      default:
        return 0;
    }
  };

  // Format Helper
  const formatValue = (val: number, type: MetricType): string => {
    if (val === 0) return "-";
    if (type === 'avg_occupants' || type === 'avg_rooms') {
      return val.toFixed(1);
    }
    return Math.round(val).toLocaleString("tr-TR");
  };

  const metricLabelMap: Record<MetricType, string> = {
    'person_nights': 'Kişi Geceleme (Kişi x Gün)',
    'avg_occupants': 'Ort. Konaklayan (Kişi/Gün)',
    'unique_staff': 'Toplam Konaklayan (Kişi)',
    'room_nights': 'Oda Geceleme (Oda x Gün)',
    'avg_rooms': 'Ort. Oda Kullanımı (Oda/Gün)',
    'unique_rooms': 'Toplam Kullanılan Oda (Münferit)'
  };

  const metricDescMap: Record<MetricType, string> = {
    'person_nights': 'Seçilen dönemde ilgili otel çalışanlarının bu lojmanda geçirdiği toplam gece sayısı.',
    'avg_occupants': 'Dönem boyunca lojmanda her gün ortalama kaç otel çalışanının barındığı.',
    'unique_staff': 'İlgili lojmanda dönem içinde en az 1 gece konaklamış benzersiz otel çalışanı sayısı.',
    'room_nights': 'İlgili otel personeli tarafından işgal edilen odaların oda başına geceleme sayısı toplamı.',
    'avg_rooms': 'Dönem boyunca lojmanda her gün ortalama kaç odanın ilgili otelce rezerve edildiği.',
    'unique_rooms': 'Dönem boyunca ilgili otel çalışanlarının kullanımına sunulmuş benzersiz oda sayısı.'
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#7C8363]/10 text-[#7C8363] rounded-2xl shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-xl text-[#2D332D]">Otel-Lojman Dönemsel Kullanım Matrisi</h3>
            <p className="text-xs text-stone-500">
              {startDate && endDate ? (
                <>Dönem: <strong className="text-stone-700">{startDate}</strong> ile <strong className="text-stone-700">{endDate}</strong> arası ({data.daysCount} Gün)</>
              ) : (
                "Lütfen yukarıdan bir tarih aralığı süzgeci belirleyin."
              )}
            </p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-4"
      >
        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-stone-50 p-2 rounded-2xl border border-stone-200/50">
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 px-2">Görünüm Metriği:</span>
          {(Object.keys(metricLabelMap) as MetricType[]).map((mKey) => (
            <button
              key={mKey}
              onClick={() => setActiveMetric(mKey)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeMetric === mKey 
                  ? 'bg-[#2D332D] text-white shadow-sm' 
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {metricLabelMap[mKey].split(' (')[0]}
            </button>
          ))}
        </div>

        {/* Metric Explanation & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#FAF9F6] border border-stone-200/60 rounded-2xl gap-3 text-xs text-stone-600">
          <div className="flex gap-2.5 items-start">
            <Info className="w-4.5 h-4.5 text-[#7C8363] shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-800 font-bold">{metricLabelMap[activeMetric]}</strong>:{" "}
              {metricDescMap[activeMetric]}
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl self-start sm:self-center transition-all shadow-sm shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Matrisleri Excel İndir
          </button>
        </div>

        {/* Usage Matrix Grid Table */}
        <div className="bg-white border border-stone-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-stone-50/85 border-b border-stone-200/80">
                  <th className="p-4 text-xs font-bold text-stone-700 min-w-[180px]">Lojman / Tesis Adı</th>
                  {visibleHotels.map(hotel => (
                    <th key={hotel.id} className="p-4 text-xs font-bold text-stone-700 text-center">
                      <div className="flex flex-col items-center">
                        <span className="truncate max-w-[130px] font-bold text-[#2D332D]">{hotel.name}</span>
                        {hotel.branchCode && (
                          <span className="text-[10px] text-stone-400 font-mono font-medium">{hotel.branchCode}</span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-xs font-bold text-stone-800 text-center bg-[#FAF9F6] min-w-[100px] border-l border-stone-200/50">Genel Toplam</th>
                </tr>
              </thead>
              <tbody>
                {visibleFacilities.map(fac => {
                  const rowTotal = getRowMetricTotal(fac.id, activeMetric);
                  return (
                    <tr key={fac.id} className="border-b border-stone-100 hover:bg-stone-50/50 transition-colors">
                      <td className="p-4 text-xs font-semibold text-stone-700 flex items-center gap-2">
                        <Bed className="w-4 h-4 text-[#7C8363] shrink-0 opacity-80" />
                        <span>{fac.name}</span>
                      </td>
                      {visibleHotels.map(hotel => {
                        const val = getCellMetricValue(fac.id, hotel.id, activeMetric);
                        const hasValue = val > 0;
                        return (
                          <td 
                            key={hotel.id} 
                            className={`p-4 text-xs font-mono text-center transition-colors ${
                              hasValue ? 'font-bold text-[#3B422B] bg-[#7C8363]/6' : 'text-stone-300 font-normal'
                            }`}
                          >
                            {formatValue(val, activeMetric)}
                          </td>
                        );
                      })}
                      <td className="p-4 text-xs font-mono font-bold text-center bg-[#FAF9F6] text-stone-800 border-l border-stone-200/40">
                        {formatValue(rowTotal, activeMetric)}
                      </td>
                    </tr>
                  );
                })}
                {/* Totals Row */}
                <tr className="bg-stone-50/70 font-semibold border-t border-stone-200">
                  <td className="p-4 text-xs font-bold text-[#2D332D]">Genel Toplam</td>
                  {visibleHotels.map(hotel => {
                    const colTotal = getColMetricTotal(hotel.id, activeMetric);
                    return (
                      <td key={hotel.id} className="p-4 text-xs font-mono text-center text-[#2D332D] font-bold">
                        {formatValue(colTotal, activeMetric)}
                      </td>
                    );
                  })}
                  <td className="p-4 text-xs font-mono font-extrabold text-center bg-[#FAF9F6] text-[#7C8363] border-l border-stone-200/50">
                    {formatValue(getGrandMetricTotal(activeMetric), activeMetric)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
