import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';
import { BedDouble, DoorOpen, ShieldAlert, CheckCircle, AlertTriangle, Building, Briefcase, Building2 } from 'lucide-react';
import { Room, Accommodation, Staff, Facility, Hotel } from '../../types';

interface CapacitySectionProps {
  rooms: Room[];
  accommodations: Accommodation[];
  staff: Staff[];
  allowedDormIds: string[];
  facilities: Facility[];
  hotels: Hotel[];
}

const BED_COLORS = {
  dolu: '#7C8363',    // Brand sage
  bos: '#D9D3C1',     // Soft beige/sand
  bakimda: '#EF4444', // Red
};

const ROOM_COLORS = {
  aktif: '#7C8363',     // Brand sage
  bakimda: '#F59E0B',   // Orange
  pasif: '#78716C',     // Warm gray
};

export default function CapacitySection({ rooms, accommodations, staff, allowedDormIds, facilities, hotels }: CapacitySectionProps) {
  // Filter rooms belonging to authorized facilities
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => allowedDormIds.includes(r.facilityId));
  }, [rooms, allowedDormIds]);

  // Active accommodations in these facilities
  const activeAccs = useMemo(() => {
    return accommodations.filter(a => a.status === 'active' && allowedDormIds.includes(a.facilityId));
  }, [accommodations, allowedDormIds]);

  const activeStaffIds = useMemo(() => new Set(activeAccs.map(a => a.staffId)), [activeAccs]);
  const activeStaffInDorms = useMemo(() => {
    return staff.filter(s => s.status === 'placed' && activeStaffIds.has(s.id));
  }, [staff, activeStaffIds]);

  // Beds calculations
  const bedStats = useMemo(() => {
    let activeBeds = 0;
    let maintenanceBeds = 0;
    let passiveBeds = 0;

    filteredRooms.forEach(r => {
      if (r.status === 'active') {
        activeBeds += r.bedCount;
      } else if (r.status === 'maintenance') {
        maintenanceBeds += r.bedCount;
      } else {
        passiveBeds += r.bedCount;
      }
    });

    const filledBeds = activeStaffInDorms.length;
    const emptyBeds = Math.max(0, activeBeds - filledBeds);

    return {
      total: activeBeds + maintenanceBeds + passiveBeds,
      active: activeBeds,
      filled: filledBeds,
      empty: emptyBeds,
      maintenance: maintenanceBeds,
      passive: passiveBeds,
      occupancyRate: activeBeds > 0 ? (filledBeds / activeBeds) * 100 : 0
    };
  }, [filteredRooms, activeStaffInDorms]);

  // Rooms calculations
  const roomStats = useMemo(() => {
    let active = 0;
    let maintenance = 0;
    let passive = 0;

    filteredRooms.forEach(r => {
      if (r.status === 'active') active++;
      else if (r.status === 'maintenance') maintenance++;
      else passive++;
    });

    const total = active + maintenance + passive;
    const vacantRooms = filteredRooms.filter(r => {
      if (r.status !== 'active') return false;
      const roomAccs = activeAccs.filter(a => a.roomId === r.id);
      return roomAccs.length === 0;
    }).length;

    const fullRooms = filteredRooms.filter(r => {
      if (r.status !== 'active') return false;
      const roomAccs = activeAccs.filter(a => a.roomId === r.id);
      return roomAccs.length >= r.bedCount;
    }).length;

    const partialRooms = Math.max(0, active - vacantRooms - fullRooms);

    return {
      total,
      active,
      maintenance,
      passive,
      vacant: vacantRooms,
      full: fullRooms,
      partial: partialRooms
    };
  }, [filteredRooms, activeAccs]);

  // Prepare chart data
  const bedChartData = [
    { name: 'Dolu Yatak', value: bedStats.filled, color: BED_COLORS.dolu },
    { name: 'Boş Yatak', value: bedStats.empty, color: BED_COLORS.bos },
    { name: 'Bakımdaki Yatak', value: bedStats.maintenance, color: BED_COLORS.bakimda }
  ].filter(d => d.value > 0);

  const roomChartData = [
    { name: 'Aktif Oda', value: roomStats.active, color: ROOM_COLORS.aktif },
    { name: 'Bakımdaki Oda', value: roomStats.maintenance, color: ROOM_COLORS.bakimda },
    { name: 'Pasif Oda', value: roomStats.passive, color: ROOM_COLORS.pasif }
  ].filter(d => d.value > 0);

  // 1. Dorm-based occupancy calculation (Lojman Bazlı Doluluk Oranı)
  const dormOccupancyData = useMemo(() => {
    return allowedDormIds.map(dormId => {
      const facility = facilities.find(f => f.id === dormId);
      const name = facility ? facility.name : dormId;
      
      const dormRooms = rooms.filter(r => r.facilityId === dormId);
      const activeBeds = dormRooms.filter(r => r.status === 'active').reduce((sum, r) => sum + r.bedCount, 0);
      const filledBeds = accommodations.filter(a => a.status === 'active' && a.facilityId === dormId).length;
      const occupancyRate = activeBeds > 0 ? Math.round((filledBeds / activeBeds) * 1000) / 10 : 0;
      
      return {
        id: dormId,
        name,
        'Doluluk Oranı (%)': occupancyRate,
        'Dolu Yatak': filledBeds,
        'Aktif Kapasite': activeBeds
      };
    }).sort((a, b) => b['Doluluk Oranı (%)'] - a['Doluluk Oranı (%)']); // Sort descending by occupancy rate
  }, [allowedDormIds, facilities, rooms, accommodations]);

  // 2. Department-based occupant count calculation (Departmanlara Göre Konaklayan Sayısı)
  const departmentOccupantData = useMemo(() => {
    // Filter active accommodations for allowed dorms
    const activeAccsForDorms = accommodations.filter(a => a.status === 'active' && allowedDormIds.includes(a.facilityId));
    
    // Group and count by staff department
    const counts: Record<string, number> = {};
    activeAccsForDorms.forEach(acc => {
      const s = staff.find(st => st.id === acc.staffId);
      const dept = s?.department?.trim() || 'Tanımsız';
      counts[dept] = (counts[dept] || 0) + 1;
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      'Konaklayan Sayısı': count
    })).sort((a, b) => b['Konaklayan Sayısı'] - a['Konaklayan Sayısı']); // Sort descending
  }, [accommodations, allowedDormIds, staff]);

  // 3. Hotel-based usage calculation (Otellere Göre Konaklayan Kişi Sayısı)
  const hotelOccupantData = useMemo(() => {
    const activeAccsForDorms = accommodations.filter(
      a => a.status === 'active' && allowedDormIds.includes(a.facilityId)
    );

    const hotelStatsMap: Record<string, { roomsSet: Set<string>; occupantsCount: number }> = {};

    activeAccsForDorms.forEach(acc => {
      const s = staff.find(st => st.id === acc.staffId);
      if (!s) return;
      
      const hotelId = s.hotelId;
      if (!hotelStatsMap[hotelId]) {
        hotelStatsMap[hotelId] = {
          roomsSet: new Set<string>(),
          occupantsCount: 0
        };
      }
      
      hotelStatsMap[hotelId].occupantsCount += 1;
      hotelStatsMap[hotelId].roomsSet.add(acc.roomId);
    });

    return Object.entries(hotelStatsMap).map(([hotelId, data]) => {
      const hotelObj = hotels.find(h => h.id === hotelId);
      const name = hotelObj ? hotelObj.name : `Bilinmeyen Otel (${hotelId})`;
      const branchCode = hotelObj?.branchCode || '';
      return {
        id: hotelId,
        name,
        branchCode,
        occupants: data.occupantsCount,
        roomsUsed: data.roomsSet.size
      };
    }).sort((a, b) => b.occupants - a.occupants);
  }, [accommodations, allowedDormIds, staff, hotels]);

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
      {/* Bed Capacity Card */}
      <div className="card-standard p-6 flex flex-col justify-between md:col-span-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-[#7C8363]" />
              Yatak Kapasite Analizi
            </h4>
            <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded">Real-time</span>
          </div>
          <p className="text-xs text-stone-500 mb-6">Aktif, boş ve bakımdaki yatak doluluk dağılımı</p>
        </div>

        <div className="h-56 relative flex items-center justify-center">
          {bedChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bedChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {bedChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8E6E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#2D332D', fontWeight: 600, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-stone-400 text-xs">Yatak verisi bulunmamaktadır.</div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-serif font-bold text-[#2D332D]">{bedStats.active}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Aktif Yatak</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-stone-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7C8363]" />
              Dolu
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{bedStats.filled}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D9D3C1]" />
              Boş
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{bedStats.empty}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              Arızalı
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{bedStats.maintenance}</div>
          </div>
        </div>
      </div>

      {/* Room Capacity Card */}
      <div className="card-standard p-6 flex flex-col justify-between md:col-span-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-[#7C8363]" />
              Oda Kapasite Analizi
            </h4>
            <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded">Real-time</span>
          </div>
          <p className="text-xs text-stone-500 mb-6">Toplam tanımlı odaların aktiflik ve bakım durumları</p>
        </div>

        <div className="h-56 relative flex items-center justify-center">
          {roomChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roomChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {roomChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E8E6E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                  itemStyle={{ color: '#2D332D', fontWeight: 600, fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-stone-400 text-xs">Oda verisi bulunmamaktadır.</div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-serif font-bold text-[#2D332D]">{roomStats.total}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Toplam Oda</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-stone-100">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#7C8363]" />
              Aktif
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{roomStats.active}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              Bakımda
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{roomStats.maintenance}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#78716C]" />
              Pasif
            </div>
            <div className="text-lg font-serif font-bold text-stone-800 mt-1">{roomStats.passive}</div>
          </div>
        </div>
      </div>

      {/* Numerical Snapshot Table */}
      <div className="card-standard p-6 flex flex-col justify-between">
        <div>
          <h4 className="font-serif font-bold text-lg text-[#2D332D] mb-4 flex items-center gap-2">
            Konsolide Özet Raporu
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Aktif Yatak Kapasitesi</span>
              <span className="font-mono font-bold text-[#2D332D]">{bedStats.active}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Lojmandaki Personel (Dolu)</span>
              <span className="font-mono font-bold text-[#7C8363]">{bedStats.filled}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Anlık Doluluk Oranı</span>
              <span className="font-mono font-bold text-[#7C8363]">{bedStats.occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tamamen Boş Odalar</span>
              <span className="font-mono font-bold text-stone-600">{roomStats.vacant}</span>
            </div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tam Dolu Odalar</span>
              <span className="font-mono font-bold text-stone-600">{roomStats.full}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Kısmi Dolu Odalar</span>
              <span className="font-mono font-bold text-stone-600">{roomStats.partial}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#F5F2ED] border border-[#E8E6E1] p-4 rounded-xl flex items-start gap-3 mt-6">
          {bedStats.occupancyRate > 90 ? (
            <>
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-orange-800">Yüksek Doluluk Uyarısı</p>
                <p className="text-[10px] text-stone-600 mt-1">Lojman yatak doluluk oranı %90 sınırını aşmıştır. Yeni yerleşim taleplerinde alternatif odaları gözden geçirin.</p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-[#7C8363] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-[#2D332D]">Kapasite Durumu Kararlı</p>
                <p className="text-[10px] text-stone-600 mt-1">Yatak atamaları için yeterli boş alan bulunmaktadır. Odalarda genel doluluk dengeli dağılmaktadır.</p>
              </div>
            </>
          )}
        </div>
      </div>
      </motion.div>

      {/* New Occupancy, Hotel and Department Charts Row */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        {/* Lojman Dolulukları */}
        <div className="card-standard p-8 flex flex-col justify-start">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-serif font-bold text-xl text-[#2D332D] flex items-center gap-2.5">
                <Building className="w-5.5 h-5.5 text-[#7C8363]" />
                Lojman Dolulukları
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C8363] bg-[#7C8363]/10 px-3 py-1 rounded-md">
                Kapasite Dağılımı
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Her bir lojmanın aktif yatak kapasitesine göre güncel doluluk, boş yatak ve doluluk yüzdeleri
            </p>
          </div>

          <div className="space-y-6">
            {dormOccupancyData.length > 0 ? (
              dormOccupancyData.map((item) => {
                const occupancy = item['Doluluk Oranı (%)'];
                const filled = item['Dolu Yatak'];
                const total = item['Aktif Kapasite'];
                const empty = Math.max(0, total - filled);

                // Determine bar color based on occupancy level
                let barColor = 'bg-[#7C8363]';
                let textColor = 'text-[#7C8363]';
                let bgColor = 'bg-[#7C8363]/10';

                if (occupancy >= 90) {
                  barColor = 'bg-rose-600';
                  textColor = 'text-rose-600';
                  bgColor = 'bg-rose-50';
                } else if (occupancy >= 75) {
                  barColor = 'bg-amber-600';
                  textColor = 'text-amber-600';
                  bgColor = 'bg-amber-50';
                } else if (occupancy > 0) {
                  barColor = 'bg-[#7C8363]';
                  textColor = 'text-[#7C8363]';
                  bgColor = 'bg-[#7C8363]/10';
                } else {
                  barColor = 'bg-stone-300';
                  textColor = 'text-stone-400';
                  bgColor = 'bg-stone-100';
                }

                return (
                  <div key={item.id} className="space-y-3 border-b border-stone-200/50 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#2D332D] truncate">{item.name}</span>
                      <span className={`text-xs font-extrabold px-3 py-1 rounded-lg ${bgColor} ${textColor} shadow-sm`}>
                        %{occupancy.toFixed(1)} Doluluk
                      </span>
                    </div>

                    {/* Custom Spacious Progress Bar */}
                    <div className="w-full bg-stone-100 rounded-full h-5 overflow-hidden flex shadow-inner border border-stone-200/40 relative">
                      <div 
                        className={`${barColor} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, occupancy)}%` }}
                      />
                    </div>

                    {/* Sub Info Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-500 font-semibold gap-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-stone-800">
                          <span className="w-2 h-2 rounded-full bg-[#7C8363] inline-block"></span>
                          <strong>{filled}</strong> Dolu Yatak
                        </span>
                        <span className="text-stone-300">|</span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                          <strong>{empty}</strong> Boş Yatak
                        </span>
                      </div>
                      <span className="text-stone-400 font-mono text-xs">Toplam Yatak Kapasitesi: {total}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Building className="w-8 h-8 opacity-20" />
                <p className="text-xs font-medium">Lojman doluluk verisi bulunamadı</p>
              </div>
            )}
          </div>
        </div>

        {/* Otellere Göre Konaklama */}
        <div className="card-standard p-8 flex flex-col justify-start">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-serif font-bold text-xl text-[#2D332D] flex items-center gap-2.5">
                <Building2 className="w-5.5 h-5.5 text-[#7C8363]" />
                Otellere Göre Konaklama
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C8363] bg-[#7C8363]/10 px-3 py-1 rounded-md">
                Otel Kullanımı
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Otellerin güncel lojman oda ve yatak (kişi) kullanım miktarları ile yüzde payları
            </p>
          </div>

          <div className="space-y-5">
            {hotelOccupantData.length > 0 ? (
              (() => {
                const maxOccupants = Math.max(...hotelOccupantData.map(h => h.occupants), 1);
                const totalOccupants = hotelOccupantData.reduce((sum, h) => sum + h.occupants, 0);

                return hotelOccupantData.map((item, index) => {
                  const count = item.occupants;
                  const relativePercentage = (count / maxOccupants) * 100;
                  const ratioOfTotal = Math.round((count / totalOccupants) * 1000) / 10;

                  return (
                    <div key={item.id} className="space-y-2 border-b border-stone-200/40 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 flex items-center justify-center bg-stone-100 rounded-full text-xs font-bold text-[#7C8363] font-mono shrink-0 border border-stone-200/50">
                            {index + 1}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-[#2D332D] truncate">{item.name}</span>
                            {item.branchCode && (
                              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide">
                                {item.branchCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-stone-400 font-bold font-mono">%{ratioOfTotal} Pay</span>
                          <span className="text-xs font-extrabold text-stone-900 bg-stone-100 border border-stone-200 px-3 py-1 rounded-lg font-mono shadow-sm">
                            {count} Kişi
                          </span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-stone-50 rounded-full h-4 overflow-hidden shadow-inner border border-stone-200/30 relative">
                        <div 
                          className="bg-[#7C8363] h-full rounded-full transition-all duration-500"
                          style={{ width: `${relativePercentage}%` }}
                        />
                      </div>

                      {/* Sub Info Row */}
                      <div className="flex items-center justify-between text-xs text-stone-500 font-semibold pt-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#7C8363]"></span>
                          <strong>{item.roomsUsed}</strong> Oda Kullanımı
                        </span>
                        <span className="text-stone-400">
                          <strong>{count}</strong> Yatak / Personel
                        </span>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Building2 className="w-8 h-8 opacity-20" />
                <p className="text-xs font-medium">Otel konaklama verisi bulunamadı</p>
              </div>
            )}
          </div>
        </div>

        {/* Konaklayan Kişi Sayısı */}
        <div className="card-standard p-8 flex flex-col justify-start">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-serif font-bold text-xl text-[#2D332D] flex items-center gap-2.5">
                <Briefcase className="w-5.5 h-5.5 text-[#2D332D]" />
                Konaklayan Kişi Sayısı
              </h4>
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 bg-stone-100 px-3 py-1 rounded-md">
                Personel Dağılımı
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Lojmanlarda konaklayan personelin departman bazında sayısal dağılımı
            </p>
          </div>

          <div className="space-y-5">
            {departmentOccupantData.length > 0 ? (
              (() => {
                const maxCount = Math.max(...departmentOccupantData.map(d => d['Konaklayan Sayısı']), 1);
                const totalOccupants = departmentOccupantData.reduce((sum, d) => sum + d['Konaklayan Sayısı'], 0);
                
                return departmentOccupantData.map((item, index) => {
                  const count = item['Konaklayan Sayısı'];
                  const relativePercentage = (count / maxCount) * 100;
                  const ratioOfTotal = Math.round((count / totalOccupants) * 1000) / 10;
                  
                  return (
                    <div key={item.name} className="space-y-2 border-b border-stone-200/40 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 flex items-center justify-center bg-stone-100 rounded-full text-xs font-bold text-stone-600 font-mono shrink-0 border border-stone-200/50">
                            {index + 1}
                          </span>
                          <span className="text-sm font-bold text-[#2D332D] truncate">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-stone-400 font-bold font-mono">%{ratioOfTotal} Pay</span>
                          <span className="text-xs font-extrabold text-[#7C8363] bg-[#7C8363]/10 border border-[#7C8363]/20 px-3 py-1 rounded-lg font-mono shadow-sm">
                            {count} Kişi
                          </span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="w-full bg-stone-50 rounded-full h-4 overflow-hidden shadow-inner border border-stone-200/30 relative">
                        <div 
                          className="bg-[#2D332D] h-full rounded-full transition-all duration-500"
                          style={{ width: `${relativePercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="w-full py-16 flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-200 rounded-xl bg-stone-50">
                <Briefcase className="w-8 h-8 opacity-20" />
                <p className="text-xs font-medium">Departman konaklama verisi bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
