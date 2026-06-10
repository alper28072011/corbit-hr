import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs, setDoc } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import Login from "./Login";
import { User } from "../../types";

import DataSync from "./DataSync";

export default function AuthProvider({ children }: { children: import('react').ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { currentUser, setCurrentUser } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.status === 'inactive') {
               auth.signOut();
               setCurrentUser(null);
            } else {
               setCurrentUser({ id: userDoc.id, ...userData });
            }
          } else {
            // Check if a user with this email was created through settings
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const userRecord = querySnapshot.docs[0];
              const userData = userRecord.data() as User;
              
              if (userData.status === 'inactive') {
                 auth.signOut();
                 setCurrentUser(null);
              } else {
                 setCurrentUser({ id: userRecord.id, ...userData });
              }
            } else if (user.email === 'kubilay.alper.aktas@rubiplatinum.com') {
              const seedData: Omit<User, 'id'> = {
                email: 'kubilay.alper.aktas@rubiplatinum.com',
                role: 'super_admin',
                fullName: 'Kubilay Alper Aktaş',
                assignedHotelId: 'all',
                status: 'active'
              };
              await setDoc(doc(db, "users", user.uid), seedData);
              setCurrentUser({ id: user.uid, ...seedData } as User);
            } else {
              console.error("Kullanıcı verisi bulunamadı.");
              auth.signOut();
              setCurrentUser(null);
            }
          }
        } catch (error: any) {
          console.error("Auth provider getDoc error:", error);
          if (error?.message?.includes("Missing or insufficient permissions") || String(error).includes("Missing or insufficient permissions")) {
            setAuthError("Firestore izinleri yetersiz (Missing or insufficient permissions). Lütfen Firebase Console üzerinden firestore.rules dosyanızı güncelleyiniz.");
          } else {
             try {
                handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
             } catch(handledError) {
                // caught to prevent crashing the async function
             }
          }
          auth.signOut();
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'auth');
    });

    return () => unsubscribe();
  }, [setCurrentUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-stone-200 border-t-[#7C8363]"></div>
      </div>
    );
  }

  // To check if a user is currently logged
  if (!currentUser) {
    if (authError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E8E6E1] p-6 text-center">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <span className="text-3xl">⚠️</span>
             </div>
             <h2 className="text-xl font-bold text-stone-800 mb-2">Giriş Yapılamadı</h2>
             <p className="text-stone-600 mb-6">{authError}</p>
             <button 
               onClick={() => { setAuthError(null); auth.signOut(); }}
               className="w-full bg-[#7C8363] text-white py-3 rounded-xl hover:bg-[#6A7152] transition-colors"
             >
               Tekrar Dene
             </button>
          </div>
        </div>
      );
    }
    return <Login />;
  }

  return (
    <>
      <DataSync />
      {children}
    </>
  );
}
