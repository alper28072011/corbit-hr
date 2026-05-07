import { useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import { User, Hotel, Facility, Room, Staff, Accommodation, MaintenanceRequest } from "../../types";

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

    // 3. Facilities
    let facilitiesQuery: any = collection(db, "facilities");
    let roomsQuery: any = collection(db, "rooms");
    let staffQuery: any = collection(db, "staff");
    let accommodationsQuery: any = collection(db, "accommodations");
    let maintenanceQuery: any = collection(db, "maintenanceRequests");

    if (currentUser.role === 'hotel_hr_manager' && currentUser.assignedHotelId) {
      facilitiesQuery = query(collection(db, "facilities"), where("hotelId", "==", currentUser.assignedHotelId));
      staffQuery = query(collection(db, "staff"), where("hotelId", "==", currentUser.assignedHotelId));
    } else if (currentUser.role === 'facility_manager' && currentUser.assignedFacilityId) {
      roomsQuery = query(collection(db, "rooms"), where("facilityId", "==", currentUser.assignedFacilityId));
      accommodationsQuery = query(collection(db, "accommodations"), where("facilityId", "==", currentUser.assignedFacilityId));
      maintenanceQuery = query(collection(db, "maintenanceRequests"), where("facilityId", "==", currentUser.assignedFacilityId));
    }

    unsubs.push(
      onSnapshot(facilitiesQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Facility));
        setFacilities(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "facilities"))
    );

    // 4. Rooms
    unsubs.push(
      onSnapshot(roomsQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Room));
        setRooms(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "rooms"))
    );

    // 5. Staff
    unsubs.push(
      onSnapshot(staffQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Staff));
        setStaff(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "staff"))
    );

    // 6. Accommodations
    unsubs.push(
      onSnapshot(accommodationsQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Accommodation));
        setAccommodations(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "accommodations"))
    );

    // 7. Maintenance Requests
    unsubs.push(
      onSnapshot(maintenanceQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MaintenanceRequest));
        setMaintenanceRequests(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "maintenanceRequests"))
    );

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [currentUser]);

  return null;
}
