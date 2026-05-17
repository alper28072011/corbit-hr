import { useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy, doc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import { User, Hotel, Facility, Room, Staff, Accommodation, MaintenanceRequest, ActionLog } from "../../types";
import { hasPermission } from "../../lib/permissions";

export default function DataSync() {
  const { 
    currentUser, 
    setUsers, 
    setHotels, 
    setFacilities, 
    setRooms, 
    setStaff, 
    setAccommodations, 
    setMaintenanceRequests 
  } = useStore();

  useEffect(() => {
    if (!currentUser) return;

    const unsubs: Array<() => void> = [];

    // 0. Roles sync
    unsubs.push(
      onSnapshot(collection(db, "roles"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        useStore.getState().setRoles(data);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "roles"))
    );

    // App Settings
    unsubs.push(
      onSnapshot(doc(db, "settings", "general"), (doc) => {
        if (doc.exists()) {
          useStore.getState().setAppSettings(doc.data());
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, "settings/general"))
    );

    // 1. Users sync (only for super_admin or hr_director normally, but we might need it for Navbar names. 
    // Wait, the prompt says filter by role. But everyone probably needs to see users for settings?
    // Let's just fetch all users if admin, otherwise only themselves? We'll fetch all for simplicity in UI,
    // or we can just fetch all users.
    unsubs.push(
      onSnapshot(collection(db, "users"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(data);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "users"))
    );

    // 2. Hotels
    unsubs.push(
      onSnapshot(collection(db, "hotels"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hotel));
        setHotels(data);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "hotels"))
    );

    const hotelIds = currentUser.assignedHotelIds?.length ? currentUser.assignedHotelIds : (currentUser.assignedHotelId ? [currentUser.assignedHotelId] : []);
    const facilityIds = currentUser.assignedFacilityIds?.length ? currentUser.assignedFacilityIds : (currentUser.assignedFacilityId ? [currentUser.assignedFacilityId] : []);

    // 3. Facilities
    unsubs.push(
      onSnapshot(collection(db, "facilities"), (snapshot: any) => {
        let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Facility));
        if (currentUser.role === 'hotel_hr_manager') {
          data = data.filter(d => d.allowedHotelIds?.some((id: string) => hotelIds.includes(id)) || (d as any).hotelId && hotelIds.includes((d as any).hotelId));
        }
        setFacilities(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "facilities"))
    );

    // 4. Rooms
    unsubs.push(
      onSnapshot(collection(db, "rooms"), (snapshot: any) => {
        let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Room));
        if (currentUser.role === 'facility_manager') {
          data = data.filter(d => facilityIds.includes(d.facilityId));
        }
        setRooms(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "rooms"))
    );

    // 5. Staff
    unsubs.push(
      onSnapshot(collection(db, "staff"), (snapshot: any) => {
        let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Staff));
        if (currentUser.role === 'hotel_hr_manager') {
          data = data.filter(d => hotelIds.includes(d.hotelId));
        }
        setStaff(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "staff"))
    );

    // 6. Accommodations
    unsubs.push(
      onSnapshot(collection(db, "accommodations"), (snapshot: any) => {
        let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Accommodation));
        if (currentUser.role === 'facility_manager') {
          data = data.filter(d => facilityIds.includes(d.facilityId));
        }
        setAccommodations(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "accommodations"))
    );

    // 7. Maintenance Requests
    unsubs.push(
      onSnapshot(collection(db, "maintenanceRequests"), (snapshot: any) => {
        let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
        if (currentUser.role === 'facility_manager') {
          data = data.filter(d => facilityIds.includes(d.facilityId));
        }
        setMaintenanceRequests(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "maintenanceRequests"))
    );

    // 8. Logs
    const rolesConfig = useStore.getState().roles;
    if (hasPermission(currentUser.role, 'view_logs', rolesConfig)) {
       // Only fetch if admin or HR
       let q = query(collection(db, "logs"), orderBy("timestamp", "desc"));
       unsubs.push(
         onSnapshot(q, (snapshot: any) => {
           let data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ActionLog));
           useStore.getState().setLogs(data);
         }, (error: any) => handleFirestoreError(error, OperationType.LIST, "logs"))
       );
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [currentUser]);

  return null;
}
