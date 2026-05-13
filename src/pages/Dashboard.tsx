import { useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  Users, 
  Wrench, 
  BedDouble, 
  AlertCircle,
  TrendingUp,
  Activity,
  UserPlus
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useStore } from "../store/useStore";
import { hasPermission, PERMISSION_KEYS } from "../lib/permissions";

const COLORS = ['#7C8363', '#2D332D', '#D9D3C1', '#F5F2ED', '#A4A895'];
const GENDER_COLORS = { male: '#7C8363', female: '#D9D3C1' };

export default function Dashboard() {
  const { facilities, rooms, accommodations, staff, maintenanceRequests, currentUser, hotels, roles } = useStore();

  const authorizedFacilities = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'facility_manager') {
      const facIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);
      return facilities.filter(f => facIds.includes(f.id));
    }
    if (currentUser.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      return facilities.filter(f => hotelIds.includes(f.hotelId));
    }
    return facilities;
  }, [facilities, currentUser]);

  const facilityIds = authorizedFacilities.map(f => f.id);

  // Capacity & Occupancy
  const metrics = useMemo(() => {
    let totalCapacity = 0;
    let occupiedBeds = 0;
    
    const activeAccommodations = accommodations.filter(a => a.status === 'active' && facilityIds.includes(a.facilityId));
    occupiedBeds = activeAccommodations.length;

    const authorizedRooms = rooms.filter(r => r.status === 'active' && facilityIds.includes(r.facilityId));
    authorizedRooms.forEach(room => {
      totalCapacity += room.bedCount;
    });

    const occupancyRate = totalCapacity > 0 ? (occupiedBeds / totalCapacity) * 100 : 0;

    // Gender Distribution
    let maleCount = 0;
    let femaleCount = 0;
    activeAccommodations.forEach(acc => {
      const person = staff.find(s => s.id === acc.staffId);
      if (person?.gender === 'male') maleCount++;
      if (person?.gender === 'female') femaleCount++;
    });

    // Facility Occupancy Data for Bar Chart
    const facilityOccupancyData = authorizedFacilities.map(fac => {
      const facRooms = rooms.filter(r => r.status === 'active' && r.facilityId === fac.id);
      const cap = facRooms.reduce((sum, r) => sum + r.bedCount, 0);
      const occ = accommodations.filter(a => a.status === 'active' && a.facilityId === fac.id).length;
      return {
        name: fac.name,
        Doluluk: cap > 0 ? Math.round((occ / cap) * 100) : 0,
        occupied: occ,
        capacity: cap
      };
    });

    return {
      totalCapacity,
      occupiedBeds,
      emptyBeds: totalCapacity - occupiedBeds,
      occupancyRate: occupancyRate.toFixed(1),
      genderData: [
        { name: 'Erkek', value: maleCount },
        { name: 'Kadın', value: femaleCount }
      ].filter(d => d.value > 0),
      facilityOccupancyData
    };
  }, [authorizedFacilities, facilityIds, accommodations, rooms, staff]);

  // Open Maintenance
  const openMaintenanceCount = useMemo(() => {
    return maintenanceRequests.filter(req => req.status === 'open' && facilityIds.includes(req.facilityId)).length;
  }, [maintenanceRequests, facilityIds]);

  // Pending Staff
  const pendingStaffCount = useMemo(() => {
    let pending = staff.filter(s => s.status === 'pending_placement');
    if (currentUser?.role === 'hotel_hr_manager') {
      const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
      pending = pending.filter(s => hotelIds.includes(s.hotelId));
    }
    return pending.length;
  }, [staff, currentUser]);


  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-[#E8E6E1] shadow-lg rounded-xl">
          <p className="font-bold text-[#2D332D] mb-1">{label}</p>
          <p className="text-sm text-stone-600">Doluluk Oranı: <span className="font-bold">{payload[0].value}%</span></p>
          {payload[0].payload.capacity && (
            <p className="text-xs text-stone-400 mt-1">
              {payload[0].payload.occupied} / {payload[0].payload.capacity} Yatak
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#2D332D]">Dashboard</h2>
          <p className="text-stone-500 mt-1">
            {currentUser?.role === 'facility_manager' 
              ? 'Sorumlu olduğunuz lojmanın anlık durumu.' 
              : 'Zincir genelindeki personel lojmanlarına genel bakış.'}
          </p>
        </div>
        <div className="flex gap-3">
          {hasPermission(currentUser?.role, PERMISSION_KEYS.add_staff_request, roles) && (
            <Link to="/staff" className="px-4 py-2 border border-[#E8E6E1] rounded-xl bg-white hover:bg-stone-50 text-sm font-semibold transition-colors flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Yeni Talep
            </Link>
          )}
          {hasPermission(currentUser?.role, PERMISSION_KEYS.place_staff, roles) && (
            <Link to="/staff" className="px-4 py-2 bg-[#7C8363] text-white rounded-xl text-sm font-semibold shadow-sm hover:bg-[#6A7152] transition-colors flex items-center gap-2">
              <BedDouble className="w-4 h-4" />
              Yerleşim Yap
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#2D332D] text-white p-6 rounded-[32px] shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm text-stone-300 font-medium">Doluluk Oranı</p>
              <Activity className="w-5 h-5 text-[#A4A895]" />
            </div>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-serif font-bold">{metrics.occupancyRate}%</p>
            </div>
            <div className="mt-4 w-full bg-stone-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${Number(metrics.occupancyRate) > 90 ? 'bg-orange-500' : 'bg-[#D9D3C1]'}`} 
                style={{ width: `${Math.min(100, Number(metrics.occupancyRate))}%` }}
              ></div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
            <Building2 className="w-32 h-32" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-stone-500 font-medium">Kapasite Kullanımı</p>
            <Users className="w-5 h-5 text-stone-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-serif font-bold text-[#2D332D]">{metrics.occupiedBeds}</p>
              <span className="text-stone-400 text-sm font-medium">/ {metrics.totalCapacity} Yatak</span>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="text-xs font-bold px-2 py-1 bg-stone-100 text-stone-600 rounded-md">
                Dolu: {metrics.occupiedBeds}
              </span>
              <span className="text-xs font-bold px-2 py-1 bg-[#F5F2ED] text-[#7C8363] rounded-md">
                Boş: {metrics.emptyBeds}
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-stone-500 font-medium">Yerleşim Bekleyen</p>
            <AlertCircle className="w-5 h-5 text-stone-400" />
          </div>
          <div>
            <p className="text-4xl font-serif font-bold text-[#2D332D]">{pendingStaffCount}</p>
            <p className="text-xs text-stone-400 mt-3 font-medium flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#7C8363]" />
              Havuzda bekleyen personel
            </p>
          </div>
        </div>

        <div className="bg-[#FFF8F3] p-6 rounded-[32px] border border-orange-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-orange-800/70 font-medium">Açık Arıza / Bakım</p>
            <Wrench className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-4xl font-serif font-bold text-orange-800">{openMaintenanceCount}</p>
            {openMaintenanceCount > 0 ? (
              <p className="text-xs text-orange-700/80 mt-3 font-bold bg-orange-100/50 w-fit px-2 py-1 rounded-md">
                Müdahale bekliyor
              </p>
            ) : (
              <p className="text-xs text-stone-500 mt-3 font-medium">Tüm arızalar giderildi</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart - Facility Occupancy */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold text-lg text-[#1A1C18]">Lojman Doluluk Oranları (%)</h3>
            <p className="text-sm text-stone-500">Tesis bazlı doluluk kapasitesi kıyaslaması</p>
          </div>
          <div className="flex-1 w-full min-h-[300px]">
             {metrics.facilityOccupancyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.facilityOccupancyData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E6E1" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12, fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#78716C', fontSize: 12 }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F5F5F4' }} />
                    <Bar dataKey="Doluluk" radius={[6, 6, 0, 0]} maxBarSize={60}>
                      {metrics.facilityOccupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.Doluluk > 90 ? '#FB923C' : '#7C8363'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
             ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 flex-col gap-2">
                  <Building2 className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Veri bulunamadı</p>
                </div>
             )}
          </div>
        </div>

        {/* Pie Chart - Gender Distribution */}
        <div className="bg-white p-8 rounded-[32px] border border-[#E8E6E1] shadow-sm flex flex-col">
          <div className="mb-2">
            <h3 className="font-bold text-lg text-[#1A1C18]">Cinsiyet Dağılımı</h3>
            <p className="text-sm text-stone-500">Mevcut konaklayan personel</p>
          </div>
          <div className="flex-1 w-full min-h-[250px] relative">
            {metrics.genderData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {metrics.genderData.map((entry, index) => (
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
                {/* Center Label inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8 text-[#2D332D]">
                  <span className="text-3xl font-serif font-bold">{metrics.occupiedBeds}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Toplam</span>
                </div>
              </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 flex-col gap-2">
                  <Users className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Henüz konaklama yok</p>
                </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

