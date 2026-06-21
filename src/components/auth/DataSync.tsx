import { useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy, doc, limit } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import { User, Hotel, Facility, Room, Staff, Accommodation, MaintenanceTicket, ActionLog, ApprovalRequest } from "../../types";
import { can } from "../../lib/permissions";

export default function DataSync() {
  const { 
    currentUser, 
    setUsers, 
    setHotels, 
    setFacilities, 
    setRooms, 
    setStaff, 
    setAccommodations, 
    setMaintenanceTickets,
    setApprovalRequests
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

    // Roles Permissions
    unsubs.push(
      onSnapshot(collection(db, "roles_permissions"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        useStore.getState().setRolesPermissions(data);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "roles_permissions"))
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
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Facility));
        setFacilities(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "facilities"))
    );

    // 4. Rooms
    let roomsQuery = collection(db, "rooms") as any;
    if (currentUser.role === 'facility_manager') {
      if (facilityIds.length > 0) roomsQuery = query(collection(db, "rooms"), where("facilityId", "in", facilityIds.slice(0, 30)));
      else roomsQuery = null;
    }
    if (roomsQuery) {
      unsubs.push(
        onSnapshot(roomsQuery, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Room));
          setRooms(data);
        }, (error: any) => handleFirestoreError(error, OperationType.LIST, "rooms"))
      );
    } else {
      setRooms([]);
    }

    // 5. Staff
    let staffQuery = collection(db, "staff") as any;
    if (currentUser.role === 'hotel_hr_manager') {
      if (hotelIds.length > 0) staffQuery = query(collection(db, "staff"), where("hotelId", "in", hotelIds.slice(0, 30)));
      else staffQuery = null;
    }
    if (staffQuery) {
      unsubs.push(
        onSnapshot(staffQuery, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Staff));
          setStaff(data);
        }, (error: any) => handleFirestoreError(error, OperationType.LIST, "staff"))
      );
    } else {
      setStaff([]);
    }

    // 6. Accommodations
    let accsQuery = collection(db, "accommodations") as any;
    if (currentUser.role === 'facility_manager') {
      if (facilityIds.length > 0) accsQuery = query(collection(db, "accommodations"), where("facilityId", "in", facilityIds.slice(0, 30)));
      else accsQuery = null;
    }
    if (accsQuery) {
      unsubs.push(
        onSnapshot(accsQuery, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Accommodation));
          setAccommodations(data);
        }, (error: any) => handleFirestoreError(error, OperationType.LIST, "accommodations"))
      );
    } else {
      setAccommodations([]);
    }

    // 7. Maintenance Tickets
    let maintenanceQuery = collection(db, "maintenanceTickets") as any;
    if (currentUser.role === 'facility_manager') {
      if (facilityIds.length > 0) maintenanceQuery = query(collection(db, "maintenanceTickets"), where("dormId", "in", facilityIds.slice(0, 30)));
      else maintenanceQuery = null;
    }
    if (maintenanceQuery) {
      unsubs.push(
        onSnapshot(maintenanceQuery, (snapshot: any) => {
          const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as MaintenanceTicket));
          setMaintenanceTickets(data);
        }, (error: any) => handleFirestoreError(error, OperationType.LIST, "maintenanceTickets"))
      );
    } else {
      setMaintenanceTickets([]);
    }

    // Approval Requests
    unsubs.push(
      onSnapshot(collection(db, "approvalRequests"), (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ApprovalRequest));
        useStore.getState().setApprovalRequests(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "approvalRequests"))
    );

    // Support Tickets
    let supportQuery = collection(db, "supportTickets") as any;
    if (currentUser.role !== 'super_admin') {
      supportQuery = query(collection(db, "supportTickets"), where("userId", "==", currentUser.id));
    }
    unsubs.push(
      onSnapshot(supportQuery, (snapshot: any) => {
        const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
        useStore.getState().setSupportTickets(data);
      }, (error: any) => handleFirestoreError(error, OperationType.LIST, "supportTickets"))
    );

    // 8. Logs
    const rolesPermissions = useStore.getState().rolesPermissions;
    if (can(currentUser.role, 'view_logs', 'settings', rolesPermissions)) {
       // Only fetch if admin or HR, limit to 200 for performance and db cost
       let q = query(collection(db, "logs"), orderBy("timestamp", "desc"), limit(200));
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
