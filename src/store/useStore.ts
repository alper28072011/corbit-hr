import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Hotel, Facility, Room, Staff, Accommodation, MaintenanceTicket, User, RoleConfig, ActionLog, ApprovalRequest, RolePermissions, SupportTicket } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, collection, addDoc, updateDoc, deleteDoc, writeBatch, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export interface UiPreferences {
  activeTabs: Record<string, string>;       // Örn: { facilityPage: 'dorms', profilePage: 'security' }
  viewModes: Record<string, 'list' | 'card' | 'rack'>; // Örn: { staffPage: 'list', rackPage: 'rack' }
  lastFilters: Record<string, any>;         // Örn: { staffPage: { hotelId: 'xyz', search: 'Kubilay', status: 'Pending' } }
  tableSorting: Record<string, { key: string; direction: 'asc' | 'desc' }>;
}

interface AppState {
  users: User[];
  roles: RoleConfig[]; // legacy
  rolesPermissions: RolePermissions[];
  currentUser: User | null;
  hotels: Hotel[];
  facilities: Facility[];
  rooms: Room[];
  staff: Staff[];
  accommodations: Accommodation[];
  maintenanceTickets: MaintenanceTicket[];
  approvalRequests: ApprovalRequest[];
  supportTickets: SupportTicket[];
  
  uiPreferences: UiPreferences;
  setUiPreference: <K extends keyof UiPreferences>(key: K, pageKey: string, value: any) => void;
  resetUiPreferences: () => void;

  refreshTrigger: number;
  triggerRefresh: () => void;

  setUsers: (users: User[]) => void;
  setRoles: (roles: RoleConfig[]) => void;
  setRolesPermissions: (perms: RolePermissions[]) => void;
  setHotels: (hotels: Hotel[]) => void;
  setFacilities: (facilities: Facility[]) => void;
  setRooms: (rooms: Room[]) => void;
  setStaff: (staff: Staff[]) => void;
  setAccommodations: (accs: Accommodation[]) => void;
  setMaintenanceTickets: (tickets: MaintenanceTicket[]) => void;
  setApprovalRequests: (reqs: ApprovalRequest[]) => void;
  setSupportTickets: (tickets: SupportTicket[]) => void;
  
  // Actions
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  updateProfile: (profileData: Partial<User>) => Promise<void>;
  changeUserPassword: (newPassword: string) => Promise<void>;

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
  bulkDeleteRooms: (roomIds: string[]) => Promise<void>;
  bulkUpdateRooms: (roomIds: string[], data: Partial<Room>) => Promise<void>;

  addStaff: (staffData: Omit<Staff, 'id'>) => Promise<void>;
  bulkAddStaffWithPlacements: (staffList: Array<{ staff: Omit<Staff, 'id'>, placement?: { facilityId: string, roomId: string } }>) => Promise<void>;
  updateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  bulkDeleteStaff: (ids: string[]) => Promise<void>;
  restoreStaff: (id: string) => Promise<void>;
  bulkRestoreStaff: (ids: string[]) => Promise<void>;
  hardDeleteStaff: (id: string) => Promise<void>;
  bulkHardDeleteStaff: (ids: string[]) => Promise<void>;
  placeStaff: (staffId: string, facilityId: string, roomId: string) => Promise<void>;
  changeStaffRoom: (staffId: string, oldRoomId: string, newRoomId: string, newFacilityId?: string) => Promise<void>;
  changeRoom: (accommodationId: string, newFacilityId: string, newRoomId: string) => Promise<void>;
  notifyCheckoutStaff: (staffId: string, checkOutDate: string) => Promise<void>;
  checkoutStaff: (accommodationId: string, checkoutDate: string) => Promise<void>;
  undoCheckoutStaff: (accommodationId: string) => Promise<void>;

  addMaintenanceTicket: (ticket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'status' | 'resolvedAt'>) => Promise<void>;
  updateMaintenanceTicket: (id: string, updates: Partial<MaintenanceTicket>) => Promise<void>;
  deleteMaintenanceTicket: (id: string) => Promise<void>;
  
  addApprovalRequest: (reqData: Omit<ApprovalRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  resolveApprovalRequest: (id: string, status: 'Onaylandı' | 'Reddedildi') => Promise<void>;
  
  createSupportTicket: (ticketData: Omit<SupportTicket, 'id' | 'userId' | 'userName' | 'userEmail' | 'status' | 'messages' | 'createdAt' | 'updatedAt'>, initialMessage: string) => Promise<void>;
  sendSupportMessage: (ticketId: string, messageText: string) => Promise<void>;
  closeSupportTicket: (ticketId: string) => Promise<void>;

  updateRolePermissions: (roleKey: string, allowedPages: string[], allowedFeatures: string[]) => Promise<void>;

  // Logs
  logs: ActionLog[];
  setLogs: (logs: ActionLog[]) => void;
  addLog: (log: Omit<ActionLog, 'id'>) => Promise<void>;
  
  appSettings: any;
  setAppSettings: (settings: any) => void;
  updateAppVersion: (version: string) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      users: [],
      roles: [],
      rolesPermissions: [],
      currentUser: null,
      hotels: [],
      facilities: [],
      rooms: [],
      staff: [],
      accommodations: [],
      maintenanceTickets: [],
      approvalRequests: [],
      supportTickets: [],
      logs: [],
      appSettings: {},
      refreshTrigger: 0,
      triggerRefresh: () => set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

      uiPreferences: {
        activeTabs: {},
        viewModes: {},
        lastFilters: {},
        tableSorting: {},
      },

      setUiPreference: (key, pageKey, value) => {
        set((state) => ({
          uiPreferences: {
            ...state.uiPreferences,
            [key]: {
              ...state.uiPreferences[key],
              [pageKey]: value,
            },
          },
        }));
      },

      resetUiPreferences: () => {
        set({
          uiPreferences: {
            activeTabs: {},
            viewModes: {},
            lastFilters: {},
            tableSorting: {},
          },
        });
      },

      setUsers: (users) => set({ users }),
      setRoles: (roles) => set({ roles }),
      setRolesPermissions: (rolesPermissions) => set({ rolesPermissions }),
      setHotels: (hotels) => set({ hotels }),
      setFacilities: (facilities) => set({ facilities }),
      setRooms: (rooms) => set({ rooms }),
      setStaff: (staff) => set({ staff }),
      setAccommodations: (accommodations) => set({ accommodations }),
      setMaintenanceTickets: (maintenanceTickets) => set({ maintenanceTickets }),
      setApprovalRequests: (approvalRequests) => set({ approvalRequests }),
      setSupportTickets: (supportTickets) => set({ supportTickets }),
      setLogs: (logs) => set({ logs }),
      setAppSettings: (appSettings) => set({ appSettings }),

      setCurrentUser: (user) => {
        set({ currentUser: user });
        if (!user) {
          get().resetUiPreferences();
        }
      },

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

      updateProfile: async (profileData) => {
        try {
          const state = get();
          if (!state.currentUser) throw new Error('Not authenticated');
          
          // Secure: Do not allow modifying restricted fields
          const safeData = {
            fullName: profileData.fullName,
            phone: profileData.phone,
            avatarUrl: profileData.avatarUrl,
          };
          
          await updateDoc(doc(db, "users", state.currentUser.id), Object.fromEntries(Object.entries(safeData).filter(([_, v]) => v !== undefined)));
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/profile`);
        }
      },

      changeUserPassword: async (newPassword) => {
        try {
          if (!auth.currentUser) throw new Error('Not authenticated');
          await updatePassword(auth.currentUser, newPassword);
        } catch (error: any) {
          // If requires recent login, this might throw 'auth/requires-recent-login'
          throw new Error(error.message || 'Şifre güncellenemedi. Lütfen tekrar giriş yapıp deneyin.');
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

      bulkDeleteRooms: async (roomIds: string[]) => {
        try {
          const batch = writeBatch(db);
          roomIds.forEach(id => {
            batch.delete(doc(db, "rooms", id));
          });
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, "bulkDeleteRooms");
        }
      },

      bulkUpdateRooms: async (roomIds: string[], data: Partial<Room>) => {
        try {
          const batch = writeBatch(db);
          roomIds.forEach(id => {
            batch.update(doc(db, "rooms", id), data);
          });
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, "bulkUpdateRooms");
        }
      },

      addStaff: async (staffData) => {
         try {
           const batch = writeBatch(db);
           const staffDocRef = doc(collection(db, "staff"));
           batch.set(staffDocRef, staffData);

           const state = get();
           if (state.currentUser) {
             const logDocRef = doc(collection(db, "logs"));
             batch.set(logDocRef, {
               entityId: staffDocRef.id,
               entityType: 'staff',
               action: 'create',
               changes: 'Personel kaydı oluşturuldu.',
               performedBy: state.currentUser.fullName || state.currentUser.email,
               timestamp: Date.now()
             });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "staff");
         }
      },

      bulkAddStaffWithPlacements: async (staffList) => {
        try {
          const batch = writeBatch(db);
          const state = get();
          
          staffList.forEach(item => {
            const docRef = doc(collection(db, "staff"));
            const staffData = { ...item.staff };
            
            if (item.placement) {
              staffData.status = 'placed';
              const accommodationRef = doc(collection(db, "accommodations"));
              batch.set(accommodationRef, {
                staffId: docRef.id,
                facilityId: item.placement.facilityId,
                roomId: item.placement.roomId,
                checkInDate: new Date().toISOString().split('T')[0],
                status: 'active'
              });
            } else {
              staffData.status = 'pending_placement';
            }
            
            batch.set(docRef, staffData);
          });
          
          if (state.currentUser) {
             const logDocRef = doc(collection(db, "logs"));
             batch.set(logDocRef, {
               entityId: 'bulk',
               entityType: 'staff',
               action: 'create',
               changes: `${staffList.length} adet personel (gerekli yerleşimleriyle birlikte) toplu olarak oluşturuldu.`,
               performedBy: state.currentUser.fullName || state.currentUser.email,
               timestamp: Date.now()
             });
          }
          
          await batch.commit();

        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "bulkAddStaffWithPlacements");
        }
      },

      updateStaff: async (id, data) => {
         try {
           const state = get();
           const oldData = state.staff.find(s => s.id === id);
           
           const batch = writeBatch(db);
           batch.update(doc(db, "staff", id), data);

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
               const logDocRef = doc(collection(db, "logs"));
               batch.set(logDocRef, {
                 entityId: id,
                 entityType: 'staff',
                 action: 'update',
                 changes: `Personel bilgileri güncellendi: ${changes.join(', ')}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
               });
             }
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `staff/${id}`);
         }
      },
      
      deleteStaff: async (id) => {
         try {
           const state = get();
           const oldData = state.staff.find(s => s.id === id);
           if (!oldData) return;
           
           const batch = writeBatch(db);
           
           // Soft delete: Personel durumunu güncelle ve silinme tarihi ekle
           const staffRef = doc(db, "staff", id);
           batch.update(staffRef, { 
             deletedAt: Date.now(),
             status: 'pending_placement' // Lojman kaydı silindiği için
           });
           
           // İlgili konaklama kayıtlarını (accommodations) bul ve sil
           const accQuery = query(collection(db, "accommodations"), where("staffId", "==", id));
           const accSnapshot = await getDocs(accQuery);
           accSnapshot.forEach(docSnap => {
             batch.delete(docSnap.ref);
           });
           
           if (state.currentUser && oldData) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: state.currentUser.id, 
                 entityType: 'staff',
                 action: 'delete',
                 changes: `Personel kaydı çöp kutusuna taşındı (${oldData.fullName}).`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
         }
      },

      bulkDeleteStaff: async (ids) => {
         try {
           const state = get();
           const chunkSize = 30; // Firestore 'in' query limit is 30
           
           for (let i = 0; i < ids.length; i += chunkSize) {
             const chunk = ids.slice(i, i + chunkSize);
             if (chunk.length === 0) break;
             
             const batch = writeBatch(db);
             
             // Soft delete staff
             chunk.forEach(id => {
               batch.update(doc(db, "staff", id), { 
                 deletedAt: Date.now(),
                 status: 'pending_placement'
               });
             });
             
             const accQuery = query(collection(db, "accommodations"), where("staffId", "in", chunk));
             const accSnapshot = await getDocs(accQuery);
             accSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
             
             await batch.commit();
           }
           
           if (state.currentUser && ids.length > 0) {
              await get().addLog({
                 entityId: state.currentUser.id,
                 entityType: 'staff',
                 action: 'delete',
                 changes: `${ids.length} adet personel kaydı çöp kutusuna taşındı.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, "bulkDeleteStaff");
         }
      },

      restoreStaff: async (id) => {
        try {
          const state = get();
          const batch = writeBatch(db);
          batch.update(doc(db, "staff", id), { deletedAt: deleteField() });
          
          if (state.currentUser) {
            const logDocRef = doc(collection(db, "logs"));
            batch.set(logDocRef, {
               entityId: state.currentUser.id, 
               entityType: 'staff',
               action: 'update',
               changes: `Personel kaydı çöp kutusundan geri yüklendi.`,
               performedBy: state.currentUser.fullName || state.currentUser.email,
               timestamp: Date.now()
            });
          }
          await batch.commit();
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `staff/${id}`);
        }
      },

      bulkRestoreStaff: async (ids) => {
        try {
          const state = get();
          const chunkSize = 30;
          for (let i = 0; i < ids.length; i += chunkSize) {
            const chunk = ids.slice(i, i + chunkSize);
            if (chunk.length === 0) break;
            const batch = writeBatch(db);
            chunk.forEach(id => {
              batch.update(doc(db, "staff", id), { deletedAt: deleteField() });
            });
            await batch.commit();
          }
          if (state.currentUser && ids.length > 0) {
            await get().addLog({
               entityId: state.currentUser.id,
               entityType: 'staff',
               action: 'update',
               changes: `${ids.length} adet personel çöp kutusundan geri yüklendi.`,
               performedBy: state.currentUser.fullName || state.currentUser.email,
               timestamp: Date.now()
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, "bulkRestoreStaff");
        }
      },

      hardDeleteStaff: async (id) => {
         try {
           const state = get();
           const batch = writeBatch(db);
           batch.delete(doc(db, "staff", id));
           
           const logQuery = query(collection(db, "action_logs"), where("entityId", "==", id));
           const logSnapshot = await getDocs(logQuery);
           logSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
           
           if (state.currentUser) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: state.currentUser.id, 
                 entityType: 'staff',
                 action: 'delete',
                 changes: `Personel kaydı tamamen silindi.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `staff/${id}`);
         }
      },

      bulkHardDeleteStaff: async (ids) => {
         try {
           const state = get();
           const chunkSize = 30;
           for (let i = 0; i < ids.length; i += chunkSize) {
             const chunk = ids.slice(i, i + chunkSize);
             if (chunk.length === 0) break;
             
             const batch = writeBatch(db);
             chunk.forEach(id => batch.delete(doc(db, "staff", id)));
             
             const logQuery = query(collection(db, "action_logs"), where("entityId", "in", chunk));
             const logSnapshot = await getDocs(logQuery);
             logSnapshot.forEach(docSnap => batch.delete(docSnap.ref));
             
             await batch.commit();
           }
           if (state.currentUser && ids.length > 0) {
              await get().addLog({
                 entityId: state.currentUser.id,
                 entityType: 'staff',
                 action: 'delete',
                 changes: `${ids.length} adet personel kaydı tamamen silindi.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, "bulkHardDeleteStaff");
         }
      },
        
      placeStaff: async (staffId, facilityId, roomId) => {
         const state = get();
         
         // Çift Doğrulama (Store Guard): Cinsiyet uyuşmazlığı kontrolü
         const targetRoom = state.rooms.find(r => r.id === roomId);
         const targetStaff = state.staff.find(s => s.id === staffId);
         
         if (targetRoom && targetStaff) {
           const roomAccs = state.accommodations.filter(a => a.roomId === roomId && a.status === 'active');
           const currentResidents = state.staff.filter(s => roomAccs.some(a => a.staffId === s.id));
           
           let effectiveGender = targetRoom.genderType;
           if (targetRoom.genderType === 'mixed') {
             const hasFemale = currentResidents.some(r => r.gender === 'female');
             const hasMale = currentResidents.some(r => r.gender === 'male');
             if (hasFemale && hasMale) effectiveGender = 'mixed';
             else if (hasFemale) effectiveGender = 'female';
             else if (hasMale) effectiveGender = 'male';
             else effectiveGender = 'mixed';
           }
           
           if (
             targetRoom.genderType !== 'Aile' && 
             effectiveGender !== 'mixed' && 
             effectiveGender !== targetStaff.gender
           ) {
             throw new Error("Kritik Hata: Bu odadaki mevcut konaklayanların cinsiyeti (" + effectiveGender + "), yerleştirilmek istenen personel ile uyuşmuyor. İşlem güvenlik gereği durduruldu.");
           }
         }

         try {
           const batch = writeBatch(db);

           const accData = {
              staffId,
              facilityId,
              roomId,
              checkInDate: new Date().toISOString().split('T')[0],
              status: 'active'
           };
           const accDocRef = doc(collection(db, "accommodations"));
           batch.set(accDocRef, accData);
           
           const staffRef = doc(db, "staff", staffId);
           batch.update(staffRef, { status: 'placed' });
           
           if (state.currentUser) {
              const fac = state.facilities.find(f => f.id === facilityId);
              const rm = state.rooms.find(r => r.id === roomId);
              const roomStr = fac && rm ? `${fac.name} / ${rm.roomNumber}` : 'Bilinmeyen Oda';
              
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: staffId,
                 entityType: 'staff',
                 action: 'check_in',
                 changes: `Personel lojmana yerleştirildi: ${roomStr}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "accommodations");
         }
      },
        
      checkoutStaff: async (accommodationId, checkoutDate) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           if (!acc) return;

           const batch = writeBatch(db);
           batch.update(doc(db, "accommodations", accommodationId), { 
             status: 'checked_out', 
             checkOutDate: checkoutDate 
           });
           batch.update(doc(db, "staff", acc.staffId), { status: 'left' });
           
           if (state.currentUser) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'check_out',
                 changes: `Personel çıkışı yapıldı. (Çıkış Tarihi: ${checkoutDate})`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      undoCheckoutStaff: async (accommodationId) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           if (!acc) return;

           const batch = writeBatch(db);
           batch.update(doc(db, "accommodations", accommodationId), { 
             status: 'active', 
             checkOutDate: null 
           });
           batch.update(doc(db, "staff", acc.staffId), { status: 'placed' });
           
           if (state.currentUser) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'update',
                 changes: `Personel çıkış işlemi geri alındı. Personel tekrar lojmanda.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      changeStaffRoom: async (staffId, oldRoomId, newRoomId, newFacilityId) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.staffId === staffId && a.roomId === oldRoomId && a.status === 'active');
           if (!acc) throw new Error("Aktif konaklama kaydı bulunamadı.");

           const targetRoom = state.rooms.find(r => r.id === newRoomId);
           const fac = state.facilities.find(f => f.id === (newFacilityId || acc.facilityId));
           const oldRoom = state.rooms.find(r => r.id === oldRoomId);
           const oldFac = state.facilities.find(f => f.id === acc.facilityId);

           if (!targetRoom || !fac) throw new Error("Hedef oda veya tesis bulunamadı.");

           const batch = writeBatch(db);
           const accRef = doc(db, "accommodations", acc.id);
           
           batch.update(accRef, {
             roomId: newRoomId,
             facilityId: newFacilityId || acc.facilityId
           });

           if (state.currentUser) {
              const oldRoomStr = oldFac && oldRoom ? `${oldFac.name} ${oldRoom.roomNumber}` : 'Bilinmeyen Oda';
              const newRoomStr = `${fac.name} ${targetRoom.roomNumber}`;
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: staffId,
                 entityType: 'staff',
                 action: 'room_change',
                 changes: `${oldRoomStr} Odasından ${newRoomStr} Odasına taşındı.`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }

           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, "accommodations");
         }
      },
      changeRoom: async (accommodationId, newFacilityId, newRoomId) => {
         try {
           const state = get();
           const acc = state.accommodations.find(a => a.id === accommodationId);
           
           const batch = writeBatch(db);
           const accRef = doc(db, "accommodations", accommodationId);
           
           batch.update(accRef, {
             facilityId: newFacilityId,
             roomId: newRoomId
           });
           
           if (state.currentUser && acc) {
              const fac = state.facilities.find(f => f.id === newFacilityId);
              const rm = state.rooms.find(r => r.id === newRoomId);
              const roomStr = fac && rm ? `${fac.name} / ${rm.roomNumber}` : 'Bilinmeyen Oda';
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: acc.staffId,
                 entityType: 'staff',
                 action: 'room_change',
                 changes: `Oda değiştirildi. Yeni Oda: ${roomStr}`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `accommodations/${accommodationId}`);
         }
      },

      notifyCheckoutStaff: async (staffId, checkOutDate) => {
         try {
           const state = get();
           const batch = writeBatch(db);
           const staffRef = doc(db, "staff", staffId);
           batch.update(staffRef, { status: 'pending_checkout', checkOutDate });
           
           if (state.currentUser) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: staffId,
                 entityType: 'staff',
                 action: 'update',
                 changes: `Personel için lojmandan çıkış bildirildi (Çıkış Tarihi: ${checkOutDate}).`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }
           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `staff/${staffId}`);
         }
      },

      addMaintenanceTicket: async (reqData) => {
         try {
           const payload = {
             ...reqData,
             createdAt: Date.now(),
             status: 'Açık',
           };
           const state = get();
           const batch = writeBatch(db);
           const ticketRef = doc(collection(db, "maintenanceTickets"));
           batch.set(ticketRef, payload);

           if (state.currentUser) {
              const logDocRef = doc(collection(db, "logs"));
              batch.set(logDocRef, {
                 entityId: ticketRef.id,
                 entityType: 'maintenance',
                 action: 'create',
                 changes: `Yeni arıza/bakım kaydı oluşturuldu. (${payload.title})`,
                 performedBy: state.currentUser.fullName || state.currentUser.email,
                 timestamp: Date.now()
              });
           }

           // Optimistic Update
           set(s => ({
              maintenanceTickets: [{ id: ticketRef.id, ...payload } as any, ...s.maintenanceTickets]
           }));

           await batch.commit();
         } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "maintenanceTickets");
         }
      },

      updateMaintenanceTicket: async (id, updates) => {
         try {
           if (updates.status === 'Kapalı' || updates.status === 'İptal Edildi') {
               updates.resolvedAt = Date.now();
           } else if (updates.status === 'Açık' || updates.status === 'İşlemde') {
               updates.resolvedAt = null as unknown as undefined; // Assuming you might want to clear it, but let's just delete the field if we don't want it, or just use null
           }
           await updateDoc(doc(db, "maintenanceTickets", id), updates);
         } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `maintenanceTickets/${id}`);
         }
      },

      deleteMaintenanceTicket: async (id) => {
         try {
           await deleteDoc(doc(db, "maintenanceTickets", id));
         } catch (error) {
           handleFirestoreError(error, OperationType.DELETE, `maintenanceTickets/${id}`);
         }
      },

      addApprovalRequest: async (reqData) => {
        try {
          const payload = {
            ...reqData,
            createdAt: Date.now(),
            status: 'Bekliyor',
          };
          await addDoc(collection(db, "approvalRequests"), payload);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, "approvalRequests");
        }
      },

      resolveApprovalRequest: async (id, status) => {
        try {
          await updateDoc(doc(db, "approvalRequests", id), { status });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `approvalRequests/${id}`);
        }
      },

      updateAppVersion: async (version: string) => {
        try {
          await setDoc(doc(db, "settings", "general"), { version }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, "settings/general");
        }
      },

      updateRolePermissions: async (roleKey, allowedPages, allowedFeatures) => {
        try {
          const docRef = doc(db, "roles_permissions", roleKey);
          await setDoc(docRef, { roleKey, allowedPages, allowedFeatures }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `roles_permissions/${roleKey}`);
        }
      },
      
      createSupportTicket: async (ticketData, initialMessage) => {
        try {
          const state = get();
          const user = state.currentUser;
          if (!user) return;
          
          const payload = {
            ...ticketData,
            userId: user.id,
            userName: user.fullName || user.email,
            userEmail: user.email,
            status: 'Açık',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messages: [{
              id: Date.now().toString(),
              senderId: user.id,
              senderName: user.fullName || user.email,
              senderRole: user.role,
              message: initialMessage,
              timestamp: Date.now()
            }]
          };
          
          await addDoc(collection(db, "supportTickets"), payload);
        } catch (error) {
           handleFirestoreError(error, OperationType.CREATE, "supportTickets");
        }
      },
      
      sendSupportMessage: async (ticketId, messageText) => {
        try {
          const state = get();
          const user = state.currentUser;
          if (!user) return;
          
          const newMessage = {
            id: Date.now().toString(),
            senderId: user.id,
            senderName: user.fullName || user.email,
            senderRole: user.role,
            message: messageText,
            timestamp: Date.now()
          };
          
          const newStatus = user.role === 'super_admin' ? 'Cevaplandı' : 'Açık';
          
          await updateDoc(doc(db, "supportTickets", ticketId), {
            messages: arrayUnion(newMessage),
            status: newStatus,
            updatedAt: Date.now()
          });
          
        } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${ticketId}`);
        }
      },
      
      closeSupportTicket: async (ticketId) => {
        try {
          await updateDoc(doc(db, "supportTickets", ticketId), {
            status: 'Sonlandırıldı',
            updatedAt: Date.now()
          });
        } catch (error) {
           handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${ticketId}`);
        }
      }
    }),
    {
      name: 'corbit-ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ uiPreferences: state.uiPreferences }),
    }
  )
);


