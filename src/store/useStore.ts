import { create } from 'zustand';
import { Hotel, Facility, Room, Staff, Accommodation, MaintenanceRequest, User, RoleConfig, ActionLog } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

interface AppState {
  users: User[];
  roles: RoleConfig[];
  currentUser: User | null;
  hotels: Hotel[];
  facilities: Facility[];
  rooms: Room[];
  staff: Staff[];
  accommodations: Accommodation[];
  maintenanceRequests: MaintenanceRequest[];
  
  setUsers: (users: User[]) => void;
  setRoles: (roles: RoleConfig[]) => void;
  setHotels: (hotels: Hotel[]) => void;
  setFacilities: (facilities: Facility[]) => void;
  setRooms: (rooms: Room[]) => void;
  setStaff: (staff: Staff[]) => void;
  setAccommodations: (accs: Accommodation[]) => void;
  setMaintenanceRequests: (reqs: MaintenanceRequest[]) => void;
  
  // Actions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;

  addRole: (role: Omit<RoleConfig, 'id'>) => Promise<void>;
  updateRole: (id: string, data: Partial<RoleConfig>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  addHotel: (hotel: Omit<Hotel, 'id'>) => Promise<void>;
  updateHotel: (id: string, data: Partial<Hotel>) => Promise<void>;
  deleteHotel: (id: string) => Promise<void>;

  addFacility: (facility: Omit<Facility, 'id'>) => Promise<void>;
  updateFacility: (id: string, data: Partial<Facility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;

  addRoom: (room: Omit<Room, 'id'>) => Promise<void>;
  addRoomsBulk: (rooms: Omit<Room, 'id'>[]) => Promise<void>;
  updateRoom: (id: string, data: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  addStaff: (staffData: Omit<Staff, 'id'>) => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  placeStaff: (staffId: string, facilityId: string, roomId: string) => Promise<void>;
  changeRoom: (accommodationId: string, newFacilityId: string, newRoomId: string) => Promise<void>;
  checkoutStaff: (accommodationId: string, checkoutDate: string) => Promise<void>;
  undoCheckoutStaff: (accommodationId: string) => Promise<void>;

  addMaintenanceRequest: (req: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'status' | 'resolvedAt'>) => Promise<void>;
  updateMaintenanceStatus: (id: string, status: MaintenanceRequest['status']) => Promise<void>;
  deleteMaintenanceRequest: (id: string) => Promise<void>;
  
  // Logs
  logs: ActionLog[];
  setLogs: (logs: ActionLog[]) => void;
  addLog: (log: Omit<ActionLog, 'id'>) => Promise<void>;
  
  appSettings: any;
  setAppSettings: (settings: any) => void;
  updateAppVersion: (version: string) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
      users: [],
      roles: [],
      currentUser: null,
      hotels: [],
      facilities: [],
      rooms: [],
      staff: [],
      accommodations: [],
      maintenanceRequests: [],
      logs: [],
      appSettings: {},

      setUsers: (users) => set({ users }),
      setRoles: (roles) => set({ roles }),
      setHotels: (hotels) => set({ hotels }),
      setFacilities: (facilities) => set({ facilities }),
      setRooms: (rooms) => set({ rooms }),
      setStaff: (staff) => set({ staff }),
      setAccommodations: (accommodations) => set({ accommodations }),
      setMaintenanceRequests: (maintenanceRequests) => set({ maintenanceRequests }),
      setLogs: (logs) => set({ logs }),
      setAppSettings: (appSettings) => set({ appSettings }),

      setCurrentUser: (user) => set({ currentUser: user }),

      addLog: async (logData) => {
        try {
          await addDoc(collection(db, "logs"), logData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "logs");
        }
      },

      addRole: async (roleData) => {
        try {
          await addDoc(collection(db, "roles"), roleData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "roles");
        }
      },

      updateRole: async (id, data) => {
        try {
          await updateDoc(doc(db, "roles", id), data);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `roles/${id}`);
        }
      },

      deleteRole: async (id) => {
        try {
          await deleteDoc(doc(db, "roles", id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `roles/${id}`);
        }
      },

      addUser: async (userData) => {
        try {
          await addDoc(collection(db, "users"), userData);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "users");
        }
      },

      updateUser: async (id, data) => {
        try {
          await updateDoc(doc(db, "users", id), data);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
        }
      },

      deleteUser: async (id) => {
        try {
          await deleteDoc(doc(db, "users", id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${id}`);
        }
      },

      addHotel: async (hotelData) => {
         try {
           await addDoc(collection(db, "hotels"), hotelData);
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "hotels");
         }
      },

      updateHotel: async (id, data) => {
         try {
           await updateDoc(doc(db, "hotels", id), data);
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `hotels/${id}`);
         }
      },

      deleteHotel: async (id) => {
         try {
           await deleteDoc(doc(db, "hotels", id));
           // No cascading here to simplify, real system requires batched writes or cloud func
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `hotels/${id}`);
         }
      },

      addFacility: async (facilityData) => {
         try {
           await addDoc(collection(db, "facilities"), facilityData);
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "facilities");
         }
      },

      updateFacility: async (id, data) => {
         try {
           await updateDoc(doc(db, "facilities", id), data);
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `facilities/${id}`);
         }
      },

      deleteFacility: async (id) => {
         try {
           await deleteDoc(doc(db, "facilities", id));
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `facilities/${id}`);
         }
      },

      addRoom: async (roomData) => {
         try {
           await addDoc(collection(db, "rooms"), roomData);
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "rooms");
         }
      },

      addRoomsBulk: async (roomsData) => {
         try {
           // Firestore batch is better, but doing sequential addDoc for simplicity here
           const promises = roomsData.map(r => addDoc(collection(db, "rooms"), r));
           await Promise.all(promises);
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "rooms(bulk)");
         }
      },

      updateRoom: async (id, data) => {
         try {
           const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
           await updateDoc(doc(db, "rooms", id), cleanData);
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `rooms/${id}`);
         }
      },

      deleteRoom: async (id) => {
         try {
           await deleteDoc(doc(db, "rooms", id));
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `rooms/${id}`);
         }
      },

      addStaff: async (staffData) => {
         try {
           const docRef = await addDoc(collection(db, "staff"), staffData);
           const state = get();
           if (state.currentUser) {
             await get().addLog({
               entityId: docRef.id,
               entityType: 'staff',
               action: 'create',
               changes: 'Personel kaydı oluşturuldu.',
               performedBy: state.currentUser.fullName || state.currentUser.email,
               timestamp: Date.now()
             });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "staff");
         }
      },

      updateStaff: async (id, data) => {
         try {
           const state = get();
           const oldData = state.staff.find(s => s.id === id);
           
           await updateDoc(doc(db, "staff", id), data);

           if (state.currentUser && oldData) {
             const changes: string[] = [];
             Object.entries(data).forEach(([key, newValue]) => {
               const oldValue = (oldData as any)[key];
               if (oldValue !== newValue && key !== 'status') {
                   // Status usually updated automatically by system actions
                   changes.push(`${key}: ${oldValue} -> ${newValue}`);
               }
             });

             if (changes.length > 0) {
               await get().addLog({
                 entityId: id,
                 entityType: 'staff',
                 action: 'update',
                 changes: `Personel bilgileri güncellendi: ${changes.join(', ')}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
               });
             }
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `staff/${id}`);
         }
      },
      
      deleteStaff: async (id) => {
         try {
           const state = get();
           const oldData = state.staff.find(s => s.id === id);
           
           await deleteDoc(doc(db, "staff", id));
           
           if (state.currentUser && oldData) {
              await get().addLog({
                 entityId: id,
                 entityType: 'staff',
                 action: 'delete',
                 changes: `Personel kaydı silindi (${oldData.fullName}).`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
         }
      },
        
      placeStaff: async (staffId, facilityId, roomId) => {
         try {
           const state = get();
           const accData = {
              staffId,
              facilityId,
              roomId,
              checkInDate: new Date().toISOString().split('T')[0],
              status: 'active'
           };
           await addDoc(collection(db, "accommodations"), accData);
           await updateDoc(doc(db, "staff", staffId), { status: 'placed' });
           
           if (state.currentUser) {
              const fac = state.facilities.find(f => f.id === facilityId);
              const rm = state.rooms.find(r => r.id === roomId);
              const roomStr = fac && rm ? `${fac.name} / ${rm.roomNumber}` : 'Bilinmeyen Oda';
              
              await get().addLog({
                 entityId: staffId,
                 entityType: 'staff',
                 action: 'check_in',
                 changes: `Personel lojmana yerleştirildi: ${roomStr}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "accommodations");
         }
      },
        
      checkoutStaff: async (accommodationId, checkoutDate) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           if (!acc) return;

           await updateDoc(doc(db, "accommodations", accommodationId), { 
             status: 'checked_out', 
             checkOutDate: checkoutDate 
           });
           await updateDoc(doc(db, "staff", acc.staffId), { status: 'left' });
           
           if (state.currentUser) {
              await get().addLog({
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'check_out',
                 changes: `Personel çıkışı yapıldı. (Çıkış Tarihi: ${checkoutDate})`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      undoCheckoutStaff: async (accommodationId) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           if (!acc) return;

           await updateDoc(doc(db, "accommodations", accommodationId), { 
             status: 'active', 
             checkOutDate: null 
           });
           await updateDoc(doc(db, "staff", acc.staffId), { status: 'placed' });
           
           if (state.currentUser) {
              await get().addLog({
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'update',
                 changes: `Personel çıkış işlemi geri alındı. Personel tekrar lojmanda.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      changeRoom: async (accommodationId, newFacilityId, newRoomId) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           
           await updateDoc(doc(db, "accommodations", accommodationId), {
             facilityId: newFacilityId,
             roomId: newRoomId
           });
           
           if (state.currentUser && acc) {
              const fac = state.facilities.find(f => f.id === newFacilityId);
              const rm = state.rooms.find(r => r.id === newRoomId);
              const roomStr = fac && rm ? `${fac.name} / ${rm.roomNumber}` : 'Bilinmeyen Oda';
              
              await get().addLog({
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'room_change',
                 changes: `Oda değiştirildi. Yeni Oda: ${roomStr}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      addMaintenanceRequest: async (reqData) => {
         try {
           const payload = {
             ...reqData,
             createdAt: new Date().toISOString(),
             status: 'open',
           };
           await addDoc(collection(db, "maintenanceRequests"), payload);
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "maintenanceRequests");
         }
      },

      updateMaintenanceStatus: async (id, status) => {
         try {
           const state = get();
           const req = state.maintenanceRequests.find(r => r.id === id);
           const payload: any = { status };
           if (status === 'resolved') {
               payload.resolvedAt = new Date().toISOString();
           } else if (req && req.resolvedAt) {
               payload.resolvedAt = null;
           }
           await updateDoc(doc(db, "maintenanceRequests", id), payload);
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `maintenanceRequests/${id}`);
         }
      },

      deleteMaintenanceRequest: async (id) => {
         try {
           await deleteDoc(doc(db, "maintenanceRequests", id));
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `maintenanceRequests/${id}`);
         }
      },

      updateAppVersion: async (version: string) => {
        try {
          await setDoc(doc(db, "settings", "general"), { version }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, "settings/general");
        }
      }
}));


