import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase.js';

const ROOT_SUPER_ADMIN_EMAILS = [
  'samarthv080@gmail.com',
  'rtrsamarthviswanath@gmail.com',
  'srinidhi.vanamamalai@gmail.com',
  'karthik.ms.2908@gmail.com',
];

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
          const userEmail = (firebaseUser.email || '').toLowerCase().trim();
          const isRootSuperAdmin = ROOT_SUPER_ADMIN_EMAILS.includes(userEmail);

          // Force refresh token to check custom claims
          let claimRole: string | null = null;
          try {
            const tokenResult = await firebaseUser.getIdTokenResult(true);
            claimRole = typeof tokenResult.claims.role === 'string' ? tokenResult.claims.role : null;
          } catch (tErr) {
            console.warn('Could not refresh ID token claims:', tErr);
          }

          // 1. Check admin profile document by UID
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          let adminSnap = await getDoc(adminDocRef);
          let adminData = adminSnap.exists() ? adminSnap.data() : null;

          // 2. If not found by UID, check by email
          if (!adminData && userEmail) {
            try {
              const emailQ = query(
                collection(db, 'admins'),
                where('email', '==', userEmail)
              );
              const qSnap = await getDocs(emailQ);
              if (!qSnap.empty && qSnap.docs[0]) {
                adminData = qSnap.docs[0].data();
                // Optionally link UID to the record
                if (!adminData.uid || adminData.uid !== firebaseUser.uid) {
                  await setDoc(
                    adminDocRef,
                    { ...adminData, uid: firebaseUser.uid, updatedAt: new Date().toISOString() },
                    { merge: true }
                  );
                }
              }
            } catch (qErr) {
              console.warn('Error querying admins by email:', qErr);
            }
          }

          // 3. Fallback for Root Super Admins if no doc exists yet
          if (!adminData && isRootSuperAdmin) {
            adminData = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Super Admin',
              email: userEmail,
              role: 'SUPER_ADMIN',
              active: true,
              updatedAt: new Date().toISOString(),
            };
            try {
              await setDoc(adminDocRef, adminData, { merge: true });
            } catch (sErr) {
              console.warn('Error setting root super admin document:', sErr);
            }
          }

          if (adminData && adminData.active !== false) {
            const effectiveRole = isRootSuperAdmin
              ? 'SUPER_ADMIN'
              : adminData.role || claimRole || 'VIEW_ONLY';

            setProfile({
              uid: firebaseUser.uid,
              displayName: adminData.displayName || firebaseUser.displayName || 'Admin',
              email: userEmail,
              role: effectiveRole,
              active: true,
            });
            setError(null);
          } else {
            setProfile(null);
            setError(
              adminData && adminData.active === false
                ? 'Your administrator account has been deactivated.'
                : `Account ${userEmail} is not authorized as an administrator.`
            );
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
