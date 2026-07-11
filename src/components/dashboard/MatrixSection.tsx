import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { Building2, Users, HelpCircle, Activity, Share2, X, Info, Search, Home, ChevronRight } from 'lucide-react';
import { Hotel, Facility } from '../../types';

interface MatrixSectionProps {
  matrixHotels: Hotel[];
  facilityHotelMatrix: {
    facility: Facility;
    stats: Record<string, number>;
    total: number;
  }[];
  hotelTotals: Record<string, number>;
  activeStaffCount: number;
  sharedRoomPairsList: {
    name: string;
    count: number;
    roomNames: string[];
    details?: {
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
  }[];
}

interface HoveredPairState {
  name: string;
  roomNames: string[];
  details?: {
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
  top: number;
  left: number;
  width: number;
}

export default function MatrixSection({
  matrixHotels,
  facilityHotelMatrix,
  hotelTotals,
  activeStaffCount,
  sharedRoomPairsList
}: MatrixSectionProps) {
  const [hoveredPair, setHoveredPair] = useState<HoveredPairState | null>(null);
  const [selectedPair, setSelectedPair] = useState<any | null>(null);

  // Find maximum value in the matrix for heatmap shading calculations
  const maxMatrixValue = useMemo(() => {
    let max = 0;
    facilityHotelMatrix.forEach(row => {
      matrixHotels.forEach(h => {
        const val = row.stats[h.id] || 0;
        if (val > max) max = val;
      });
    });
    return max || 1;
  }, [facilityHotelMatrix, matrixHotels]);

  // Heatmap helper
  const getCellBgColor = (val: number) => {
    if (val === 0) return 'transparent';
    // scale opacity between 0.05 and 0.6
    const opacity = 0.05 + (val / maxMatrixValue) * 0.55;
    return `rgba(124, 131, 99, ${opacity})`;
  };

  const getCellTextColor = (val: number) => {
    if (val === 0) return 'text-stone-300';
    const ratio = val / maxMatrixValue;
    if (ratio > 0.5) return 'text-[#2D332D] font-bold';
    return 'text-[#2D332D] font-medium';
  };

  // Find shared pair data
  const getPairData = (h1Id: string, h2Id: string) => {
    if (h1Id === h2Id) return null;
    const h1 = matrixHotels.find(h => h.id === h1Id);
    const h2 = matrixHotels.find(h => h.id === h2Id);
    if (!h1 || !h2) return null;
    const h1Name = h1.branchCode || h1.name;
    const h2Name = h2.branchCode || h2.name;
    
    return sharedRoomPairsList.find(p => 
      p.name.includes(h1Name) && p.name.includes(h2Name)
    ) || null;
  };

  // Find maximum shared count for heatmap scaling
  const maxSharedValue = useMemo(() => {
    let max = 0;
    sharedRoomPairsList.forEach(p => {
      if (p.count > max) max = p.count;
    });
    return max || 1;
  }, [sharedRoomPairsList]);

  // Shared Heatmap helper
  const getSharedCellBgColor = (val: number) => {
    if (val === 0) return 'transparent';
    const opacity = 0.05 + (val / maxSharedValue) * 0.55;
    return `rgba(245, 158, 11, ${opacity})`; // Amber theme
  };

  const getSharedCellTextColor = (val: number) => {
    if (val === 0) return 'text-stone-300';
    const ratio = val / maxSharedValue;
    if (ratio > 0.5) return 'text-amber-900 font-bold';
    return 'text-amber-800 font-medium';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col gap-8 w-full relative"
    >
      {/* 1. Heatmap Table Container (Full Width) */}
      <div className="card-standard p-6 w-full flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#7C8363]" />
              Otel - Lojman Isı Haritası
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#7C8363] bg-[#7C8363]/10 px-2.5 py-1 rounded-md">
              Kullanım Matrisi
            </span>
          </div>
          <p className="text-xs text-stone-500 mb-6">
            Hangi otel personelinin hangi lojmanda kaç yatak doldurduğunu gösteren doluluk dağılımı
          </p>

          <div className="overflow-x-auto rounded-xl border border-stone-100 shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="px-4 py-3 sticky left-0 bg-stone-50 z-10 border-r border-stone-200">
                    Lojman Adı
                  </th>
                  {matrixHotels.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-center min-w-[80px]" title={h.name}>
                      {h.branchCode || h.name.substring(0, 6)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center bg-stone-100 font-bold border-l border-stone-200 text-[#2D332D]">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {facilityHotelMatrix.map((row) => (
                  <tr key={row.facility.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#2D332D] sticky left-0 bg-white hover:bg-stone-50 z-10 border-r border-stone-200">
                      {row.facility.name}
                    </td>
                    {matrixHotels.map((h) => {
                      const val = row.stats[h.id] || 0;
                      return (
                        <td
                          key={h.id}
                          className="px-4 py-3 text-center font-mono transition-all duration-150"
                          style={{ backgroundColor: getCellBgColor(val) }}
                        >
                          <span className={getCellTextColor(val)}>
                            {val > 0 ? val : '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#2D332D] bg-stone-50 border-l border-stone-200">
                      {row.total}
                    </td>
                  </tr>
                ))}

                {facilityHotelMatrix.length === 0 && (
                  <tr>
                    <td colSpan={matrixHotels.length + 2} className="py-8 text-center text-stone-400">
                      Dağılım verisi bulunamadı.
                    </td>
                  </tr>
                )}

                {/* Totals Row */}
                <tr className="bg-[#F8F7F5] border-t-2 border-stone-200 font-bold">
                  <td className="px-4 py-3 text-[#2D332D] sticky left-0 bg-[#F8F7F5] z-10 border-r border-stone-200">
                    Genel Toplam:
                  </td>
                  {matrixHotels.map((h) => (
                    <td key={h.id} className="px-4 py-3 text-center font-mono text-[#7C8363]">
                      {hotelTotals[h.id] || 0}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-mono text-[#2D332D] bg-stone-100 border-l border-stone-200">
                    {activeStaffCount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Shading Legend */}
        <div className="flex items-center justify-end gap-2 mt-6 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
          <span>Düşük Kullanım</span>
          <div className="flex h-2.5 w-24 rounded overflow-hidden border border-stone-100">
            <div className="flex-1 bg-[#7C8363]/10" />
            <div className="flex-1 bg-[#7C8363]/30" />
            <div className="flex-1 bg-[#7C8363]/50" />
            <div className="flex-1 bg-[#7C8363]/70" />
          </div>
          <span>Yoğun Kullanım</span>
        </div>
      </div>

      {/* 2. Shared Rooms Matrix Container (Full Width) */}
      <div className="card-standard p-6 w-full flex flex-col justify-between relative z-10">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <Share2 className="w-5 h-5 text-amber-600" />
              Oteller Arası Ortak Oda Paylaşım Matrisi
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md animate-pulse">
              Matris Isı Haritası
            </span>
          </div>
          <p className="text-xs text-stone-500 mb-6">
            Hangi otellerin personellerinin aynı odaları paylaştığını gösteren eşleşme matrisi (Detaylar için sayılara tıklayınız)
          </p>

          <div className="overflow-x-auto rounded-xl border border-stone-100 shadow-sm">
            <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                  <th className="px-4 py-3 sticky left-0 bg-stone-50 z-10 border-r border-stone-200">
                    Otel Adı
                  </th>
                  {matrixHotels.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-center min-w-[100px]" title={h.name}>
                      {h.branchCode || h.name.substring(0, 6)}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center bg-amber-50 font-bold border-l border-stone-200 text-amber-900">
                    Toplam Ortak Oda
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {matrixHotels.map((rowHotel) => {
                  // Calculate total shared rooms for rowHotel
                  let rowTotalShared = 0;
                  matrixHotels.forEach((colHotel) => {
                    if (rowHotel.id !== colHotel.id) {
                      const pair = getPairData(rowHotel.id, colHotel.id);
                      if (pair) rowTotalShared += pair.count;
                    }
                  });

                  return (
                    <tr key={rowHotel.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-[#2D332D] sticky left-0 bg-white hover:bg-stone-50 z-10 border-r border-stone-200">
                        {rowHotel.name} ({rowHotel.branchCode || rowHotel.name.substring(0, 3)})
                      </td>
                      {matrixHotels.map((colHotel) => {
                        if (rowHotel.id === colHotel.id) {
                          return (
                            <td
                              key={colHotel.id}
                              className="px-4 py-3 text-center font-mono text-stone-300 bg-stone-50/70"
                              title="Aynı otel içi paylaşımlar matrise dahil değildir"
                            >
                              -
                            </td>
                          );
                        }

                        const pair = getPairData(rowHotel.id, colHotel.id);
                        const val = pair ? pair.count : 0;

                        return (
                          <td
                            key={colHotel.id}
                            className={`px-4 py-3 text-center font-mono transition-all duration-150 ${
                              val > 0 ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
                            }`}
                            style={{ backgroundColor: getSharedCellBgColor(val) }}
                            onClick={() => {
                              if (pair && val > 0) {
                                setSelectedPair(pair);
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (pair && val > 0) {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const cardElement = e.currentTarget.closest('.card-standard');
                                if (cardElement) {
                                  const cardRect = cardElement.getBoundingClientRect();
                                  setHoveredPair({
                                    name: pair.name,
                                    roomNames: pair.roomNames,
                                    details: pair.details,
                                    top: rect.top - cardRect.top,
                                    left: rect.left - cardRect.left,
                                    width: rect.width,
                                  });
                                }
                              }
                            }}
                            onMouseLeave={() => setHoveredPair(null)}
                          >
                            <span className={getSharedCellTextColor(val)}>
                              {val > 0 ? val : '-'}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-900 bg-amber-50/50 border-l border-stone-200">
                        {rowTotalShared}
                      </td>
                    </tr>
                  );
                })}

                {matrixHotels.length === 0 && (
                  <tr>
                    <td colSpan={matrixHotels.length + 2} className="py-8 text-center text-stone-400">
                      Otel verisi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shading Legend */}
        <div className="flex items-center justify-end gap-2 mt-6 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
          <span>Düşük Yoğunluk</span>
          <div className="flex h-2.5 w-24 rounded overflow-hidden border border-stone-100">
            <div className="flex-1 bg-amber-500/10" />
            <div className="flex-1 bg-amber-500/30" />
            <div className="flex-1 bg-amber-500/50" />
            <div className="flex-1 bg-amber-500/70" />
          </div>
          <span>Yüksek Yoğunluk</span>
        </div>

        {/* Floating Tooltip outside the scroll container, with deep facility + occupant details */}
        {hoveredPair && (() => {
          const [h1Name, h2Name] = hoveredPair.name.includes(' & ') ? hoveredPair.name.split(' & ') : [hoveredPair.name, ''];
          const facilityCounts: Record<string, number> = {};
          hoveredPair.details?.forEach(det => {
            facilityCounts[det.facilityName] = (facilityCounts[det.facilityName] || 0) + 1;
          });

          return (
            <div
              className="absolute bg-[#2D332D]/95 backdrop-blur-md text-white text-[11px] p-4 rounded-2xl shadow-2xl z-[9999] min-w-[290px] max-w-sm whitespace-normal pointer-events-none transition-all duration-150 border border-stone-700/80"
              style={{
                top: `${hoveredPair.top - 12}px`,
                left: `${hoveredPair.left + hoveredPair.width / 2}px`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <p className="font-bold text-amber-400 mb-2 border-b border-stone-700/60 pb-1.5 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                Ortak Oda Analiz Özeti
              </p>
              
              <p className="text-stone-300 leading-relaxed mb-3">
                <span className="font-semibold text-white">{h1Name}</span> ile <span className="font-semibold text-white">{h2Name || 'diğer otel'}</span> personelleri toplamda <strong className="text-amber-400 text-xs font-bold font-mono bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">{hoveredPair.details?.length || 0}</strong> odayı paylaşmaktadır.
              </p>

              {hoveredPair.details && hoveredPair.details.length > 0 && (
                <div className="space-y-1.5 border-t border-stone-800 pt-2.5">
                  <p className="font-bold text-stone-400 uppercase tracking-wider text-[9px] mb-1">Paylaşılan Lojmanlar & Odalar:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-hide pr-1">
                    {hoveredPair.details.map((det, idx) => (
                      <div key={idx} className="flex justify-between items-center text-stone-300 text-[10px] gap-2 py-0.5 border-b border-stone-800/30 last:border-0">
                        <span className="truncate font-medium">• {det.facilityName}</span>
                        <span className="font-mono bg-stone-800/80 px-2 py-0.5 rounded text-amber-300 font-bold border border-stone-700 shrink-0">Oda {det.roomNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[9px] text-amber-400 font-bold italic mt-3 border-t border-stone-800/50 pt-2 text-center animate-pulse">
                Yerleşen kişileri görmek için tıklayınız
              </p>

              {/* Small arrow pointing down */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#2D332D] rotate-45 border-r border-b border-stone-700"></div>
            </div>
          );
        })()}
      </div>

      {/* 3. Interactive Detail Dialog (Modal Overlay) */}
      <AnimatePresence>
        {selectedPair && (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-[#2D332D] text-white p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                      <Share2 className="w-5 h-5" />
                    </span>
                    <h3 className="font-serif font-bold text-lg text-white">Ortak Oda Detaylı Analizi</h3>
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    {selectedPair.name} otellerinin personelleri tarafından ortak paylaşılan odaların ayrıntılı listesi
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedPair(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-stone-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 bg-stone-50/50">
                {/* Summary Info Graphic Panel */}
                <div className="bg-[#FDFBF7] border border-amber-100 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-inner">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded">Eşleşen Oteller</span>
                    <p className="text-sm font-bold text-[#2D332D] mt-1">{selectedPair.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Toplam Ortak Oda</p>
                      <p className="text-xl font-serif font-bold text-[#2D332D]">{selectedPair.count} Oda</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-200/50 font-serif font-extrabold text-lg">
                      {selectedPair.count}
                    </div>
                  </div>
                </div>

                {/* Rooms Detail List */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#7C8363]" />
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Oda Oda Konaklayan Listesi</h4>
                  </div>
                  <div className="space-y-3">
                    {selectedPair.details?.map((det: any, idx: number) => (
                      <div key={idx} className="border border-stone-100 rounded-xl bg-white p-4 shadow-sm hover:border-amber-200 transition-colors">
                        {/* Room and Lojman Title */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2.5 mb-3.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                            <span className="text-sm font-extrabold text-[#2D332D] font-mono bg-[#2D332D]/5 px-2 py-0.5 rounded">Oda {det.roomNumber}</span>
                            <span className="text-stone-300 font-light">|</span>
                            <span className="text-xs font-bold text-[#7C8363]">{det.facilityName}</span>
                          </div>
                          <span className="text-[9px] font-bold text-stone-400 font-mono bg-stone-100 px-2 py-0.5 rounded-md">
                            Oda ID: {det.roomId}
                          </span>
                        </div>

                        {/* Room Roommates Infographic */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {det.occupants.map((occ: any, oIdx: number) => {
                            const initials = occ.name
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();
                              
                            const firstHotelName = selectedPair.name.split(' & ')[0];
                            const isH1 = firstHotelName === occ.hotelName;

                            return (
                              <div key={oIdx} className="flex items-center gap-3 p-3 rounded-xl bg-stone-50/50 border border-stone-100/60 hover:bg-stone-50 hover:border-stone-200 transition-all">
                                {/* Roommate Initials Avatar */}
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${
                                  isH1 
                                    ? 'bg-[#7C8363]/10 text-[#7C8363] border border-[#7C8363]/20' 
                                    : 'bg-amber-100 text-amber-800 border border-amber-200/50'
                                }`}>
                                  {initials}
                                </div>

                                {/* Roommate detail text */}
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-[#2D332D] truncate" title={occ.name}>
                                    {occ.name}
                                  </p>
                                  <p className="text-[10px] text-stone-500 truncate mt-0.5 font-medium">
                                    {occ.department}
                                  </p>
                                </div>

                                {/* Hotel Badge */}
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg shrink-0 border uppercase tracking-wider ${
                                  isH1 
                                    ? 'bg-[#7C8363]/5 border-[#7C8363]/10 text-[#7C8363]' 
                                    : 'bg-amber-50 border-amber-100 text-amber-800'
                                }`}>
                                  {occ.hotelName}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-stone-50 p-4 border-t border-stone-150 flex justify-end">
                <button
                  onClick={() => setSelectedPair(null)}
                  className="px-4 py-2 bg-[#2D332D] hover:bg-[#2D332D]/90 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
