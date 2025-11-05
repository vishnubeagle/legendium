import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { migrateUserScenesToV2 } from '../utils/migration';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            scenesCompleted: {
              scene1: false,
              scene2: false,
              scene3: false,
              scene4: false,
              scene5: false,
              scene6: false,
              scene7: false,
            },
            createdAt: new Date().toISOString(),
          }, { merge: true });
        } else {
          // Use migration utility to handle scene6 and scene7
          const migrationResult = await migrateUserScenesToV2(firebaseUser.uid);
          if (migrationResult) {
            console.log('AuthContext: User migration completed successfully');
          }
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = async (email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const { uid, email: userEmail, displayName, photoURL } = credential.user;
    const userRef = doc(db, 'users', uid);
    await setDoc(
      userRef,
      {
        uid,
        email: userEmail || email,
        displayName: displayName || '',
        photoURL: photoURL || '',
        scenesCompleted: {
          scene1: false,
          scene2: false,
          scene3: false,
          scene4: false,
          scene5: false,
          scene6: false,
          scene7: false,
        },
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return credential;
  };

  const logout = () => signOut(auth);

  const value = { user, login, register, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
