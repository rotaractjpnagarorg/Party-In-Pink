import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';

interface AdminProfile {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
}

interface AdminAuthContextValue {
  user: User | null;
  profile: AdminProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(true);
        try {
          // Force refresh token to ensure fresh custom claims
          const tokenResult = await firebaseUser.getIdTokenResult(true);
          const claimRole =
            typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : null;

          // Check admin profile document in Firestore
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          const adminSnap = await getDoc(adminDocRef);

          if (adminSnap.exists()) {
            const data = adminSnap.data();
            const profileRole = typeof data.role === 'string' ? data.role : null;
            if (claimRole && profileRole === claimRole && data.active === true) {
              setProfile({
                uid: firebaseUser.uid,
                displayName: data.displayName || firebaseUser.displayName || 'Admin',
                email: firebaseUser.email || '',
                role: claimRole,
                active: true,
              });
              setError(null);
            } else {
              setProfile(null);
              setError('This account does not have an active admin role.');
            }
          } else {
            setProfile(null);
            setError(`Account ${firebaseUser.email || ''} is not authorized as an administrator.`);
          }
        } catch (err: any) {
          console.error('Error loading admin profile:', err);
          setProfile(null);
          setError(err?.message || 'Failed to load admin profile');
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const message =
        err?.code === 'auth/invalid-credential'
          ? 'Invalid email or password'
          : err?.code === 'auth/too-many-requests'
            ? 'Too many attempts. Please try again later.'
            : err?.message || 'Login failed';
      setError(message);
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      await cred.user.getIdToken(true);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        return;
      }
      const message = err?.message || 'Google sign in failed';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        isAuthenticated: !!user && !!profile?.active,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextValue => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
