import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Calendar, TrendingUp, Table, BarChart2 } from 'lucide-react';

interface TrendSectionProps {
  trendData: any[];
  isDaily: boolean;
  startDate: string;
  endDate: string;
}

export default function TrendSection({
  trendData,
  isDaily,
  startDate,
  endDate
}: TrendSectionProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const tableData = useMemo(() => {
    // Show newest first in table
    return [...trendData].reverse();
  }, [trendData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="space-y-6"
    >
      {/* Line Chart Card */}
      <div className="card-standard p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="font-serif font-bold text-lg text-[#2D332D] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#7C8363]" />
              Forecast
            </h4>
            <p className="text-xs text-stone-500">
              Seçili dönemde {isDaily ? 'günlük' : 'aylık'} gelişim ve hareketlilik {viewMode === 'chart' ? 'grafiği' : 'tablosu'}
            </p>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            {/* View Mode Switcher */}
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white text-[#2D332D] shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                Grafik
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#2D332D] shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Tablo
              </button>
            </div>

            <div className="text-xs font-medium text-stone-500 bg-stone-50 px-2.5 py-2 rounded-xl border border-stone-100 font-mono">
              {startDate} / {endDate}
            </div>
          </div>
        </div>

        {viewMode === 'chart' ? (
          <div className="h-80 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78716C', fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E8E6E1',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      padding: '12px'
                    }}
                    itemStyle={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Legend verticalAlign="top" height={40} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="Kişi Geceleme"
                    stroke="#7C8363"
                    strokeWidth={3}
                    dot={{ r: isDaily ? 1 : 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Oda Geceleme"
                    stroke="#2D332D"
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: isDaily ? 0 : 3, strokeWidth: 1.5, fill: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Giriş Yapan"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Çıkış Yapan"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                <Calendar className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">Bu dönem için trend verisi bulunamadı</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {trendData.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-stone-200/60 shadow-sm max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <th className="px-4 py-3 bg-stone-50">Dönem / Tarih</th>
                      <th className="px-4 py-3 text-right bg-stone-50">Kişi Geceleme (Person Nights)</th>
                      <th className="px-4 py-3 text-right bg-stone-50">Oda Geceleme (Room Nights)</th>
                      <th className="px-4 py-3 text-right text-emerald-700 bg-stone-50">Giriş (Check-In)</th>
                      <th className="px-4 py-3 text-right text-rose-700 bg-stone-50">Çıkış (Check-Out)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {tableData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#2D332D]">{row.name}</td>
                        <td className="px-4 py-3 text-right font-mono text-stone-700">{row['Kişi Geceleme'] ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-stone-700">{row['Oda Geceleme'] ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-semibold">+{row['Giriş Yapan'] ?? 0}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">-{row['Çıkış Yapan'] ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="w-full py-12 flex flex-col items-center justify-center text-stone-400 gap-2 border border-dashed border-stone-100 rounded-xl bg-stone-50">
                <Calendar className="w-8 h-8 opacity-20" />
                <p className="text-sm font-medium">Bu dönem için trend verisi bulunamadı</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
