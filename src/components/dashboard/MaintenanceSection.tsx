import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Wrench, AlertTriangle, Clock, Hammer, ShieldAlert } from 'lucide-react';
import { MaintenanceTicket, Facility, Room } from '../../types';

interface MaintenanceSectionProps {
  maintenanceTickets: MaintenanceTicket[];
  allowedDormIds: string[];
  facilities: Facility[];
  rooms: Room[];
}

function categorizeTicket(ticket: { title: string; description: string }): string {
  const text = `${ticket.title} ${ticket.description}`.toLowerCase();
  if (text.includes('priz') || text.includes('elektrik') || text.includes('lamba') || text.includes('ampul') || text.includes('şalter') || text.includes('kablo') || text.includes('aydınlatma')) {
    return 'Elektrik';
  }
  if (text.includes('su') || text.includes('musluk') || text.includes('gider') || text.includes('boru') || text.includes('lavabo') || text.includes('banyo') || text.includes('tuvalet') || text.includes('sızıntı') || text.includes('akıntı') || text.includes('tıkanık')) {
    return 'Sıhhi Tesisat';
  }
  if (text.includes('klima') || text.includes('havalandırma') || text.includes('ısıtma') || text.includes('soğutma') || text.includes('petek') || text.includes('kombi')) {
    return 'Klimatizasyon';
  }
  if (text.includes('kapı') || text.includes('kilit') || text.includes('dolap') || text.includes('masa') || text.includes('yatak') || text.includes('mobilya') || text.includes('çekmece') || text.includes('marangoz')) {
    return 'Mobilya & Ahşap';
  }
  if (text.includes('boya') || text.includes('badana') || text.includes('duvar') || text.includes('alçı') || text.includes('fayans') || text.includes('kalebodur')) {
    return 'İnşaat & Boya';
  }
  return 'Diğer / Genel';
}

export default function MaintenanceSection({
  maintenanceTickets,
  allowedDormIds,
  facilities,
  rooms
}: MaintenanceSectionProps) {
  // Filter relevant tickets
  const relevantTickets = useMemo(() => {
    return maintenanceTickets.filter(t => allowedDormIds.includes(t.dormId) && (t.status === 'Açık' || t.status === 'İşlemde'));
  }, [maintenanceTickets, allowedDormIds]);

  // Stacked Bar Chart data: Tickets per Facility
  const facilityTicketData = useMemo(() => {
    const counts: Record<string, { open: number; inProgress: number }> = {};
    
    // Initialize with all allowed facilities
    facilities.filter(f => allowedDormIds.includes(f.id)).forEach(f => {
      counts[f.id] = { open: 0, inProgress: 0 };
    });

    relevantTickets.forEach(t => {
      if (counts[t.dormId]) {
        if (t.status === 'Açık') counts[t.dormId].open++;
        else if (t.status === 'İşlemde') counts[t.dormId].inProgress++;
      }
    });

    return Object.entries(counts).map(([id, stats]) => {
      const facName = facilities.find(f => f.id === id)?.name || 'Bilinmeyen';
      return {
        name: facName,
        'Açık (Yeni)': stats.open,
        'İşlemde (Onarımda)': stats.inProgress,
        total: stats.open + stats.inProgress
      };
    }).filter(d => d.total > 0);
  }, [relevantTickets, facilities, allowedDormIds]);

  // Top categories
  const topCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    relevantTickets.forEach(t => {
      const cat = categorizeTicket(t);
      counts[cat] = (counts[cat] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [relevantTickets]);

  // Longest waiting critical tickets
  const criticalPendingTickets = useMemo(() => {
    return [...relevantTickets]
      .filter(t => t.priority === 'Acil' || t.priority === 'Orta')
      .sort((a, b) => a.createdAt - b.createdAt) // oldest first
      .slice(0, 4)
      .map(t => {
        const waitingMs = Date.now() - t.createdAt;
        const waitingDays = Math.floor(waitingMs / (1000 * 60 * 60 * 24));
        const waitingHours = Math.floor((waitingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        return {
          ...t,
          waitingText: waitingDays > 0 ? `${waitingDays} gün ${waitingHours} saattir` : `${waitingHours} saattir`,
          dormName: facilities.find(f => f.id === t.dormId)?.name || 'Lojman',
          roomNo: rooms.find(r => r.id === t.roomId)?.roomNumber || '-'
        };
      });
  }, [relevantTickets, facilities, rooms]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {/* 1. Stacked Bar Chart for Tickets per Lojman */}
      <div className="card-standard p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#7C8363]" />
              Lojmanlara Göre Aktif Arızalar
            </h4>
            <span className="text-xs font-bold text-stone-400 bg-stone-50 px-2 py-1 rounded">Aktif Arızalar</span>
          </div>
          <p className="text-xs text-stone-500 mb-6">
            Açık ve İşlemde durumundaki arızaların tesislere göre dağılımı (Stacked Bar Chart)
          </p>

          <div className="h-64 w-full">
            {facilityTicketData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityTicketData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78716C', fontSize: 11, fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E8E6E1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Açık (Yeni)" stackId="a" fill="#EF4444" radius={[0, 0, 4, 4]} maxBarSize={45} />
                  <Bar dataKey="İşlemde (Onarımda)" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-100 rounded-xl bg-stone-50">
                <Hammer className="w-8 h-8 opacity-20" />
                <p className="text-xs font-medium">Aktif veya bekleyen arıza kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Critical Alerts Table & Categories Summary */}
      <div className="grid grid-cols-1 gap-6">
        {/* Top Categories Block */}
        <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#991B1B] mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h5 className="font-bold text-sm">En Sık Arıza Yaşanan Kategoriler</h5>
            </div>
            <p className="text-[11px] text-[#7F1D1D]/80 mb-4">
              En sık teknik destek gerektiren ilk 3 ana arıza alanı
            </p>
            
            <div className="space-y-3">
              {topCategories.map((cat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center text-xs font-bold text-stone-700 mb-1">
                    <span>{cat.name}</span>
                    <span className="text-[#991B1B] bg-red-100/50 px-2 py-0.5 rounded-md">{cat.count} Arıza</span>
                  </div>
                  <div className="w-full bg-red-100/30 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{ width: `${(cat.count / (relevantTickets.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

              {topCategories.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">Kategorize edilecek arıza kaydı yok.</p>
              )}
            </div>
          </div>
        </div>

        {/* Critical Waiting Tickets Block */}
        <div className="bg-[#FFFBEB] border border-[#FEF3C7] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#92400E] mb-2">
              <Clock className="w-5 h-5 shrink-0" />
              <h5 className="font-bold text-sm">En Uzun Süredir Bekleyen Kritik Arızalar</h5>
            </div>
            <p className="text-[11px] text-[#78350F]/80 mb-4">
              Acil veya orta öncelikli, çözüm bekleyen en eski kayıtlar
            </p>

            <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
              {criticalPendingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white/80 border border-[#FEF3C7] rounded-xl p-3 flex items-start justify-between gap-3 shadow-xs hover:bg-white transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-800 truncate block">
                        {ticket.title}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        ticket.priority === 'Acil' 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-500 truncate mt-1">
                      {ticket.dormName} • Oda {ticket.roomNo} • {ticket.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-bold text-amber-700">{ticket.waitingText}</p>
                    <p className="text-[9px] text-stone-400 font-medium mt-0.5">bekliyor</p>
                  </div>
                </div>
              ))}

              {criticalPendingTickets.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">Bekleyen kritik arıza bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
