import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
} from '../firebase';
import {
  UserProfile,
  UserRole,
  sanitizeId,
  sanitizeString,
  VALIDATION_CONSTRAINTS,
} from '../types/fdr';

const DEMO_SESSION_STORAGE_KEY = 'aicte_fdr_demo_session_v2';

interface AuthContextType {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isDemoMode: boolean;
  isAuthReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  enterDemoSession: (role?: UserRole, institutionId?: string, institutionName?: string) => void;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  switchActiveRole: (newRole: UserRole, institutionId?: string, institutionName?: string) => Promise<void>;
  switchDemoInstitution: (institutionId: string, institutionName: string) => void;
  updateOwnProfile: (updates: {
    displayName: string;
    department: string;
    institutionName: string;
    institutionId: string;
  }) => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BOOTSTRAPPED_SUPER_ADMIN_EMAIL = 'akthar0109@gmail.com';

function buildDemoProfile(
  role: UserRole,
  institutionId = 'INST-1001',
  institutionName = 'Vidarbha Institute of Engineering & Technology'
): UserProfile {
  const nowIso = new Date().toISOString();
  const roleDefaults: Record<
    UserRole,
    { uid: string; email: string; displayName: string; dept: string; instId: string; instName: string }
  > = {
    [UserRole.SUPER_ADMIN]: {
      uid: 'demo_super_admin',
      email: 'dg.superadmin@aicte-india.org',
      displayName: 'Dr. Anil Sahasrabudhe (Super Admin)',
      dept: 'Finance & Statutory Deposit Bureau (HQ)',
      instId: 'AICTE_HQ_DELHI',
      instName: 'All India Council for Technical Education (HQ)',
    },
    [UserRole.AICTE_ADMIN]: {
      uid: 'demo_aicte_admin',
      email: 'admin.fdr@aicte-india.org',
      displayName: 'Smt. Vandana Sharma (AICTE Admin)',
      dept: 'Institutional Compliance & FDR Division',
      instId: 'AICTE_HQ_DELHI',
      instName: 'AICTE Headquarters, New Delhi',
    },
    [UserRole.AICTE_SCRUTINY_OFFICER]: {
      uid: 'demo_scrutiny_officer',
      email: 'scrutiny.north@aicte-india.org',
      displayName: 'Shri Arvind Kumar (Scrutiny Officer)',
      dept: 'Document Verification & Discrepancy Desk',
      instId: 'AICTE_RO_WEST',
      instName: 'AICTE Regional Scrutiny Cell',
    },
    [UserRole.SENIOR_APPROVING_OFFICER]: {
      uid: 'demo_senior_officer',
      email: 'approvals.hq@aicte-india.org',
      displayName: 'Dr. R. K. Chauhan (Senior Approving Officer)',
      dept: 'Statutory Approvals & NOC Sanctioning',
      instId: 'AICTE_HQ_DELHI',
      instName: 'AICTE Executive Approval Authority',
    },
    [UserRole.INSTITUTION_ADMIN]: {
      uid: 'demo_inst_admin_1',
      email: 'registrar@vietnagpur.edu.in',
      displayName: 'Dr. Rajeshwar Deshmukh (Nodal Officer)',
      dept: 'Office of the Principal & Registrar',
      instId: institutionId,
      instName: institutionName,
    },
  };

  const d = roleDefaults[role];
  return {
    uid: d.uid,
    email: d.email,
    displayName: d.displayName,
    role,
    institutionId: role === UserRole.INSTITUTION_ADMIN ? institutionId : d.instId,
    institutionName: role === UserRole.INSTITUTION_ADMIN ? institutionName : d.instName,
    department: d.dept,
    status: 'ACTIVE',
    lastActivity: nowIso,
    orgId: 'AICTE',
    createdAt: '2025-01-10T09:00:00Z',
    updatedAt: nowIso,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as UserProfile;
      }
    } catch {
      // ignore storage errors
    }
    // Default to active Super Admin demo session so prototype works out-of-the-box
    const initial = buildDemoProfile(UserRole.SUPER_ADMIN);
    try {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(initial));
    } catch {
      // ignore
    }
    return initial;
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (!currentUser) {
        setIsAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        const nowIso = new Date().toISOString();

        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setProfile(data);
          setIsDemoMode(false);
          localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(data));
        } else {
          const isSuperAdmin =
            currentUser.email?.toLowerCase() === BOOTSTRAPPED_SUPER_ADMIN_EMAIL.toLowerCase();
          const newProfile: UserProfile = {
            uid: sanitizeId(currentUser.uid),
            email: sanitizeString(
              currentUser.email || 'user@aicte-india.org',
              VALIDATION_CONSTRAINTS.MAX_NAME_TEXT
            ),
            displayName: sanitizeString(
              currentUser.displayName ||
                (isSuperAdmin ? 'AICTE Director General' : 'Institutional Nodal Officer'),
              VALIDATION_CONSTRAINTS.MAX_MEDIUM_TEXT
            ),
            role: isSuperAdmin ? UserRole.SUPER_ADMIN : UserRole.INSTITUTION_ADMIN,
            institutionId: isSuperAdmin ? 'AICTE_HQ_DELHI' : 'INST-1001',
            institutionName: isSuperAdmin
              ? 'All India Council for Technical Education (HQ)'
              : 'Vidarbha Institute of Engineering & Technology',
            department: isSuperAdmin
              ? 'Finance & Statutory Deposit Bureau'
              : 'Office of the Principal & Registrar',
            status: 'ACTIVE',
            orgId: 'AICTE',
            createdAt: nowIso,
            updatedAt: nowIso,
          };

          await setDoc(userRef, newProfile);
          setProfile(newProfile);
          setIsDemoMode(false);
          localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(newProfile));
        }
      } catch (error) {
        console.warn('Firestore profile lookup fallback to active session:', error);
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const enterDemoSession = (
    role: UserRole = UserRole.SUPER_ADMIN,
    institutionId = 'INST-1001',
    institutionName = 'Vidarbha Institute of Engineering & Technology'
  ) => {
    const nextProfile = buildDemoProfile(role, institutionId, institutionName);
    setProfile(nextProfile);
    setIsDemoMode(true);
    setAuthError(null);
    try {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(nextProfile));
    } catch {
      // ignore
    }
  };

  const loginWithGoogle = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Authentication failed.';
      setAuthError(msg);
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    setAuthError(null);
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch {
      // ignore
    }
    setProfile(null);
    try {
      localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const sendPasswordReset = async (email: string) => {
    setAuthError(null);
    await sendPasswordResetEmail(auth, email.trim());
  };

  const switchActiveRole = async (
    newRole: UserRole,
    institutionId?: string,
    institutionName?: string
  ) => {
    const targetInstId =
      institutionId ||
      (newRole === UserRole.INSTITUTION_ADMIN
        ? profile?.institutionId?.startsWith('INST-')
          ? profile.institutionId
          : 'INST-1001'
        : 'AICTE_HQ_DELHI');
    const targetInstName =
      institutionName ||
      (newRole === UserRole.INSTITUTION_ADMIN
        ? profile?.institutionId?.startsWith('INST-')
          ? profile.institutionName
          : 'Vidarbha Institute of Engineering & Technology'
        : 'All India Council for Technical Education (HQ)');

    const demoTemplate = buildDemoProfile(newRole, targetInstId, targetInstName);
    const nowIso = new Date().toISOString();

    const updated: UserProfile = {
      ...(profile || demoTemplate),
      role: newRole,
      displayName: firebaseUser ? profile?.displayName || demoTemplate.displayName : demoTemplate.displayName,
      email: firebaseUser ? profile?.email || demoTemplate.email : demoTemplate.email,
      department: demoTemplate.department,
      institutionId: demoTemplate.institutionId,
      institutionName: demoTemplate.institutionName,
      updatedAt: nowIso,
    };

    setProfile(updated);
    try {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), {
          role: newRole,
          institutionId: updated.institutionId,
          institutionName: updated.institutionName,
          department: updated.department,
          updatedAt: nowIso,
        });
      } catch (e) {
        console.warn('Role switch persisted locally; Firestore update skipped:', e);
      }
    }
  };

  const switchDemoInstitution = (institutionId: string, institutionName: string) => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      institutionId,
      institutionName,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    try {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const updateOwnProfile = async (updates: {
    displayName: string;
    department: string;
    institutionName: string;
    institutionId: string;
  }) => {
    if (!profile) return;
    const nowIso = new Date().toISOString();
    const cleaned = {
      displayName: sanitizeString(updates.displayName, VALIDATION_CONSTRAINTS.MAX_MEDIUM_TEXT),
      department: sanitizeString(updates.department, VALIDATION_CONSTRAINTS.MAX_MEDIUM_TEXT),
      institutionName: sanitizeString(updates.institutionName, VALIDATION_CONSTRAINTS.MAX_NAME_TEXT),
      institutionId: sanitizeString(updates.institutionId, VALIDATION_CONSTRAINTS.MAX_ID_LEN),
      updatedAt: nowIso,
    };

    const next = { ...profile, ...cleaned };
    setProfile(next);
    try {
      localStorage.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    if (firebaseUser) {
      try {
        await updateDoc(doc(db, 'users', firebaseUser.uid), cleaned);
      } catch (e) {
        console.warn('Profile update persisted in demo store:', e);
      }
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isDemoMode,
        isAuthReady,
        isSigningIn,
        authError,
        loginWithGoogle,
        enterDemoSession,
        logout,
        sendPasswordReset,
        switchActiveRole,
        switchDemoInstitution,
        updateOwnProfile,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
