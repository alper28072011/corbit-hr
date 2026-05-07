import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useStore } from "../../store/useStore";
import Login from "./Login";
import { User } from "../../types";

import DataSync from "./DataSync";

export default function AuthProvider({ children }: { children: import('react').ReactNode }) {
  const [loading, setLoading] = useState(true);
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
            if (user.email === 'kubilay.alper.aktas@rubiplatinum.com') {
              const seedData: Omit<User, 'id'> = {
                email: 'kubilay.alper.aktas@rubiplatinum.com',
                role: 'super_admin',
                fullName: 'Kubilay Alper Aktaş',
                assignedHotelId: 'all',
                status: 'active'
              };
              // Note: setDoc must be imported from firebase/firestore
              const { setDoc } = await import("firebase/firestore");
              await setDoc(doc(db, "users", user.uid), seedData);
              setCurrentUser({ id: user.uid, ...seedData } as User);
            } else {
              console.error("Kullanıcı verisi bulunamadı.");
              auth.signOut();
              setCurrentUser(null);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
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
    return <Login />;
  }

  return (
    <>
      <DataSync />
      {children}
    </>
  );
}
