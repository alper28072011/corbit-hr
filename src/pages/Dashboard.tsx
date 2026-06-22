import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building2, 
  Users, 
  BedDouble, 
  Activity,
  UserPlus,
  PieChart as PieChartIcon,
  BarChart3,
  ListVideo,
  DoorOpen,
  LogOut,
  Building,
  ShieldAlert
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { useStore } from "../store/useStore";
import { usePageRefresh } from "../hooks/usePageRefresh";
import { canViewPage, can, PAGE_KEYS } from "../lib/permissions";
import { cn } from "../lib/utils";
import { PageHeader } from "../components/layout/PageHeader";

const COLORS = ['#7C8363', '#2D332D', '#D9D3C1', '#C6CDB0', '#A4A895', '#F5F5F0'];
const GENDER_COLORS = { male: '#7C8363', female: '#D9D3C1' };

// --- Modular Card Components ---
function Card({ className = "", children }: { className?: string, children: React.ReactNode }) {
  return <div className={cn("card-standard flex flex-col", className)}>{children}</div>;
}

function CardHeader({ className = "", children }: { className?: string, children: React.ReactNode }) {
  return <div className={cn("p-6 pb-4 flex flex-col gap-1", className)}>{children}</div>;
}

function CardTitle({ className = "", children, icon: Icon }: { className?: string, children: React.ReactNode, icon?: any }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h3 className={cn("font-semibold text-stone-700", className)}>{children}</h3>
      {Icon && <Icon className={cn("w-5 h-5 text-stone-400", className)} />}
    </div>
  );
}

function CardContent({ className = "", children }: { className?: string, children: React.ReactNode }) {
  return <div className={cn("p-6 pt-0 flex-1", className)}>{children}</div>;
}
// -------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const refreshAction = usePageRefresh();
  const facilities = useStore(state => state.facilities);
  const rooms = useStore(state => state.rooms);
  const accommodations = useStore(state => state.accommodations);
  const staff = useStore(state => state.staff);
  const hotels = useStore(state => state.hotels);
  const currentUser = useStore(state => state.currentUser);

  const authorizedFacilities = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      return facilities.filter(f => facIds.includes(f.id));
    }
    if (currentUser.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      return facilities.filter(f => f.allowedHotelIds?.some(id => hotelIds.includes(id)) || (f as any).hotelId && hotelIds.includes((f as any).hotelId));
    }
    return facilities;
  }, [facilities, currentUser]);

  const authorizedFacilityIds = authorizedFacilities.map(f => f.id);

  const {
    activeRoomsCount,
    totalCapacity,
    activeStaffCount,
    occupancyRate,
    emptyBeds,
    genderData,
    hotelDistributionData,
    facilityOccupancyList,
    departmentDistributionList,
    departedStaffCount,
    departedStaffByDepartment,
    vacantRoomCount,
    dedicatedRoomCount,
    sharedRoomCount,
    hotelRoomDistribution
  } = useMemo(() => {
    // 1. Capacity
    const activeRooms = rooms.filter(r => r.status === 'active' && authorizedFacilityIds.includes(r.facilityId));
    const totalCapacity = activeRooms.reduce((sum, room) => sum + room.bedCount, 0);

    // 2. Active Staff via Accommodations
    const activeAccs = accommodations.filter(a => a.status === 'active' && authorizedFacilityIds.includes(a.facilityId));
    const activeStaffIds = new Set(activeAccs.map(a => a.staffId));
    const activeStaff = staff.filter(s => s.status === 'placed' && activeStaffIds.has(s.id));
    
    const activeStaffCount = activeStaff.length;

    // 3. Occupancy Rate & Empty Beds
    const occupancyRate = totalCapacity > 0 ? (activeStaffCount / totalCapacity) * 100 : 0;
    const emptyBeds = Math.max(0, totalCapacity - activeStaffCount);

    // Gender Distribution (Pie Chart)
    const males = activeStaff.filter(s => s.gender === 'male').length;
    const females = activeStaff.filter(s => s.gender === 'female').length;
    const genderData = [
      { name: 'Erkek', value: males },
      { name: 'Kadın', value: females }
    ].filter(d => d.value > 0);

    // Otele Göre Konaklama (Bar Chart)
    const hotelCounts: Record<string, number> = {};
    activeStaff.forEach(s => {
      const hotel = hotels.find(h => h.id === s.hotelId);
      const hName = hotel?.branchCode || hotel?.name || 'Bilinmeyen';
      hotelCounts[hName] = (hotelCounts[hName] || 0) + 1;
    });
    const hotelDistributionData = Object.entries(hotelCounts).map(([name, count]) => ({
      name,
      Kişi: count
    }));

    // Facility-based Occupancy (Progress bar list)
    const facilityOccupancyList = authorizedFacilities.map(fac => {
      const facRooms = activeRooms.filter(r => r.facilityId === fac.id);
      const cap = facRooms.reduce((sum, r) => sum + r.bedCount, 0);
      const occ = activeAccs.filter(a => a.facilityId === fac.id).length;
      return {
        id: fac.id,
        name: fac.name,
        capacity: cap,
        occupied: occ,
        rate: cap > 0 ? (occ / cap) * 100 : 0
      };
    }).sort((a, b) => b.rate - a.rate);

    // Department Distribution (List)
    const deptCounts: Record<string, number> = {};
    activeStaff.forEach(s => {
      const dept = s.department || 'Bilinmeyen';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const departmentDistributionList = Object.entries(deptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Departed Staff
    let departedStaffIdSet: Set<string>;
    if (currentUser?.role === 'hotel_hr_manager') {
       const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
       const leftStaff = staff.filter(s => s.status === 'left' && hotelIds.includes(s.hotelId));
       departedStaffIdSet = new Set(leftStaff.map(s => s.id));
    } else if (currentUser?.role === 'facility_manager') {
       const pastAccs = accommodations.filter(a => a.status === 'checked_out' && authorizedFacilityIds.includes(a.facilityId));
       departedStaffIdSet = new Set(pastAccs.map(a => a.staffId));
    } else {
       departedStaffIdSet = new Set(staff.filter(s => s.status === 'left').map(s => s.id));
    }
    
    const departedStaff = staff.filter(s => departedStaffIdSet.has(s.id));
    const departedStaffCount = departedStaff.length;

    const departedDeptCounts: Record<string, number> = {};
    departedStaff.forEach(s => {
      const dept = s.department || 'Bilinmeyen';
      departedDeptCounts[dept] = (departedDeptCounts[dept] || 0) + 1;
    });
    const departedStaffByDepartment = Object.entries(departedDeptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5

    // --- Room Analytics ---
    let vacantRoomCount = 0;
    let dedicatedRoomCount = 0;
    let sharedRoomCount = 0;

    const hotelRoomStats = hotels.reduce((acc, hotel) => {
      acc[hotel.id] = { hotel, dedicatedRooms: 0, sharedRooms: 0, sharedDetails: [] };
      return acc;
    }, {} as Record<string, any>);

    activeRooms.forEach(room => {
      // Find active staff in this room
      const roomAccs = activeAccs.filter(a => a.roomId === room.id);
      const roomStaffIds = new Set(roomAccs.map(a => a.staffId));
      const rStaff = staff.filter(s => s.status === 'placed' && roomStaffIds.has(s.id));

      const uniqueHotelIds = Array.from(new Set(rStaff.map(s => s.hotelId).filter(Boolean)));

      if (uniqueHotelIds.length === 0) {
        vacantRoomCount++;
      } else if (uniqueHotelIds.length === 1) {
        dedicatedRoomCount++;
        const hid = uniqueHotelIds[0];
        if (hotelRoomStats[hid]) hotelRoomStats[hid].dedicatedRooms++;
      } else {
        sharedRoomCount++;
        uniqueHotelIds.forEach(hid => {
          if (hotelRoomStats[hid]) {
            hotelRoomStats[hid].sharedRooms++;
            hotelRoomStats[hid].sharedDetails.push({
              roomName: room.roomNumber,
              sharedWith: uniqueHotelIds.filter(id => id !== hid).map(id => hotels.find(h => h.id === id)?.name || id).join(', ')
            });
          }
        });
      }
    });

    const hotelRoomDistribution = Object.values(hotelRoomStats).map((stat: any) => ({
      name: stat.hotel.branchCode || stat.hotel.name,
      'Kendine Ait': stat.dedicatedRooms,
      'Ortak Kullandığı': stat.sharedRooms,
      totalRooms: stat.dedicatedRooms + stat.sharedRooms,
      sharedDetails: stat.sharedDetails
    })).filter((d: any) => d.totalRooms > 0);

    return {
      activeRoomsCount: activeRooms.length,
      totalCapacity,
      activeStaffCount,
      occupancyRate,
      emptyBeds,
      genderData,
      hotelDistributionData,
      facilityOccupancyList,
      departmentDistributionList,
      departedStaffCount,
      departedStaffByDepartment,
      vacantRoomCount,
      dedicatedRoomCount,
      sharedRoomCount,
      hotelRoomDistribution
    };

  }, [rooms, accommodations, authorizedFacilityIds, staff, authorizedFacilities, hotels, currentUser]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[#E8E6E1] shadow-lg rounded-xl">
          <p className="font-bold text-[#2D332D] mb-1">{label}</p>
          <p className="text-sm text-stone-600">
            {payload[0].name === "Kişi" ? "Kişi Sayısı:" : "Değer:"} <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Security check
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
    <div className="w-full flex flex-col p-6 space-y-6">
      
      <PageHeader 
        title="Raporlama Merkezi"
        description={currentUser?.role === 'facility_manager' 
          ? 'Sorumlu olduğunuz lojmanların detaylı analizleri.' 
          : 'Zincir genelindeki konaklama istatistikleri ve analizler.'}
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

      {/* 1. KPI Cards (4 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#2D332D] text-white border-transparent">
          <CardHeader>
            <CardTitle className="text-stone-300" icon={Building2}>Toplam Lojman Kapasitesi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold">{totalCapacity}</div>
            <p className="text-xs text-stone-400 mt-2 font-medium">aktif odalardaki yatak sayısı</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Users}>Aktif Konaklayan Personel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#2D332D]">{activeStaffCount}</div>
            <p className="text-xs text-[#7C8363] mt-2 font-bold bg-[#F5F2ED] w-fit px-2 py-1 rounded-md">
              Şu an lojmanda kalanlar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={Activity}>Doluluk Oranı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#2D332D]">{occupancyRate.toFixed(1)}%</div>
            <div className="mt-4 w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", occupancyRate > 90 ? 'bg-orange-500' : 'bg-[#7C8363]')} 
                style={{ width: `${Math.min(100, occupancyRate)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={BedDouble}>Boş Yatak Sayısı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-serif font-bold text-[#2D332D]">{emptyBeds}</div>
            <p className="text-xs text-stone-500 mt-2 font-medium">atanmaya uygun kapasite</p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Oda Bazlı Kapasite ve Tahsis Analizi */}
      <h3 className="text-xl font-serif font-bold text-[#2D332D] mt-8 mb-4 border-b border-stone-200 pb-2 flex items-center gap-2">
        <BedDouble className="w-5 h-5 text-stone-400" />
        Oda Bazlı Kapasite ve Tahsis Analizi
      </h3>
      
      {/* A. Genel Konsolide Durum (4'lü Küçük Metrik Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Toplam Tanımlı</p>
            <div className="text-3xl font-serif font-bold text-[#2D332D] mt-1">{activeRoomsCount} <span className="text-sm font-medium text-stone-400">Oda</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Yalnızca Tek Otele Ait</p>
            <div className="text-3xl font-serif font-bold text-[#7C8363] mt-1">{dedicatedRoomCount} <span className="text-sm font-medium text-stone-400">Oda</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex flex-col justify-center relative overflow-visible">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Ortak Kullanılan</p>
            <div className="text-3xl font-serif font-bold text-amber-600 mt-1">{sharedRoomCount} <span className="text-sm font-medium text-stone-400">Oda</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex flex-col justify-center">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Hiç Kullanılmayan (Boş)</p>
            <div className="text-3xl font-serif font-bold text-stone-400 mt-1">{vacantRoomCount} <span className="text-sm font-medium text-stone-400">Oda</span></div>
          </CardContent>
        </Card>
      </div>

      {/* B. Otel Kırılımlı Oda Dağılım Tablosu & Stacked Bar Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <Card>
          <CardHeader>
            <CardTitle icon={BarChart3}>Otel Oda Paylaşım Dağılımı</CardTitle>
            <p className="text-sm text-stone-500">Hangi otel kaç oda kullanıyor ve ne kadarını paylaşıyor?</p>
          </CardHeader>
          <CardContent className="min-h-[300px]">
             {hotelRoomDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hotelRoomDistribution} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F4' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="Kendine Ait" stackId="a" fill="#7C8363" radius={[0, 0, 4, 4]} maxBarSize={50} />
                    <Bar dataKey="Ortak Kullandığı" stackId="a" fill="#D9D3C1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="w-full h-full min-h-[250px] flex items-center justify-center text-stone-400 flex-col gap-2">
                  <BedDouble className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Veri bulunamadı</p>
                </div>
             )}
          </CardContent>
        </Card>

        {/* Tablo */}
        <Card>
          <CardHeader>
            <CardTitle icon={ListVideo}>Otel Kırılımlı Oda Dağılımı</CardTitle>
            <p className="text-sm text-stone-500">Otel bazlı kullanım istisnaları (Shared Room Details)</p>
          </CardHeader>
          <CardContent className="overflow-visible">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold mb-2">
                  <th className="pb-3 pt-2 pl-2">Otel Adı</th>
                  <th className="pb-3 pt-2 text-center">Tek Başına</th>
                  <th className="pb-3 pt-2 text-center">Ortak</th>
                  <th className="pb-3 pt-2 text-center pr-2">Toplam Temas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {hotelRoomDistribution.map((hotel, idx) => (
                  <tr key={idx} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 pl-2 font-semibold text-[#2D332D]">{hotel.name}</td>
                    <td className="py-3 text-center text-stone-600 font-mono">{hotel['Kendine Ait']}</td>
                    <td className="py-3 text-center text-stone-600 font-mono relative group hover:z-50">
                      <span className="border-b border-dashed border-stone-400 cursor-help font-bold text-amber-600">
                        {hotel['Ortak Kullandığı']}
                      </span>
                      {hotel['Ortak Kullandığı'] > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-[#2D332D] text-white text-xs p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60] min-w-[220px] whitespace-normal text-left">
                          <p className="font-bold mb-1.5 border-b border-stone-600 pb-1.5 text-amber-400">Ortak Kullanılan Odalar:</p>
                          <ul className="list-disc pl-4 space-y-1 text-stone-300">
                            {hotel.sharedDetails.map((sd: any, i: number) => (
                              <li key={i}><span className="font-bold text-white max-w-[80px] truncate inline-block align-bottom">{sd.roomName}</span>: {sd.sharedWith} ile</li>
                            ))}
                          </ul>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-[#2D332D] rotate-45"></div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-center font-bold text-[#7C8363] font-mono pr-2">{hotel.totalRooms}</td>
                  </tr>
                ))}
                {hotelRoomDistribution.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-stone-400">Oda kullanımı bulunmuyor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* 3. Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={PieChartIcon}>Cinsiyet Dağılımı</CardTitle>
            <p className="text-sm text-stone-500">Aktif konaklayan personelin demografisi</p>
          </CardHeader>
          <CardContent className="min-h-[280px] relative">
             {genderData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Erkek' ? GENDER_COLORS.male : GENDER_COLORS.female} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #E8E6E1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#2D332D', fontWeight: 600 }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-stone-600 font-semibold ml-1">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-[#2D332D]">
                    <span className="text-3xl font-serif font-bold">{activeStaffCount}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Kişi</span>
                  </div>
                </>
             ) : (
                <div className="w-full h-full min-h-[250px] flex items-center justify-center text-stone-400 flex-col gap-2">
                  <Users className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Veri bulunamadı</p>
                </div>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={BarChart3}>Otele Göre Konaklama</CardTitle>
            <p className="text-sm text-stone-500">Otellerin personelleri lojmanlarda ne kadar yer kaplıyor?</p>
          </CardHeader>
          <CardContent className="min-h-[280px]">
             {hotelDistributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hotelDistributionData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F4' }} />
                    <Bar dataKey="Kişi" fill="#7C8363" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="w-full h-full min-h-[250px] flex items-center justify-center text-stone-400 flex-col gap-2">
                  <Building className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Veri bulunamadı</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Detailed Analysis (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle icon={DoorOpen}>Lojman Bazlı Doluluk</CardTitle>
          </CardHeader>
          <CardContent>
            {facilityOccupancyList.length > 0 ? (
              <div className="space-y-5">
                {facilityOccupancyList.map(fac => (
                  <div key={fac.id}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-[#2D332D]">{fac.name}</span>
                      <span className="text-xs font-semibold text-stone-500">
                        {fac.occupied} / {fac.capacity} Yatak
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full rounded-full", fac.rate > 90 ? 'bg-orange-500' : 'bg-[#7C8363]')} 
                        style={{ width: `${Math.min(100, fac.rate)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
               <div className="py-8 text-center text-sm text-stone-500">Lojman verisi bulunamadı</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle icon={ListVideo}>Departmanlara Göre Dağılım</CardTitle>
          </CardHeader>
          <CardContent>
            {departmentDistributionList.length > 0 ? (
               <div className="space-y-3">
                 {departmentDistributionList.map((dept, index) => (
                   <div key={index} className="flex justify-between items-center border-b border-stone-100 last:border-0 pb-3 last:pb-0">
                     <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-[#7C8363]" />
                       <span className="text-sm font-medium text-stone-700">{dept.name}</span>
                     </div>
                     <span className="text-sm font-bold text-[#2D332D] bg-[#F5F2ED] px-2.5 py-0.5 rounded-md">
                       {dept.count} Kişi
                     </span>
                   </div>
                 ))}
               </div>
            ) : (
               <div className="py-8 text-center text-sm text-stone-500">Departman verisi bulunamadı</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Departed/Past Staff Report */}
      <div className="mt-8 bg-stone-100/60 border border-stone-200 rounded-xl p-8 pt-6">
        <div className="flex items-center gap-2 mb-6">
          <LogOut className="w-5 h-5 text-stone-500" />
          <h3 className="font-bold text-lg text-stone-800 tracking-tight">Geçmiş Dönem Raporları</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-standard p-6 flex flex-col justify-center items-center text-center">
            <span className="text-xs uppercase tracking-widest font-bold text-stone-400 mb-2">Çıkış Yapan Personel</span>
            <div className="text-5xl font-serif font-bold text-stone-800">{departedStaffCount}</div>
            <p className="text-xs font-semibold text-stone-500 mt-2">Bugüne kadar ayrılanlar</p>
          </div>
          
          <div className="md:col-span-2 card-standard p-6">
            <h4 className="text-sm font-bold text-stone-700 mb-4">En Çok Ayrılan Departmanlar</h4>
            {departedStaffByDepartment.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {departedStaffByDepartment.map((dept, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-stone-50 border border-stone-100 rounded-lg px-4 py-2">
                     <span className="text-sm font-semibold text-stone-700">{dept.name}</span>
                     <span className="text-xs font-bold text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded-md">
                       {dept.count}
                     </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">Geçmiş konaklama kaydı bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
