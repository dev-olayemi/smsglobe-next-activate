import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User } from "firebase/auth";
import { firebaseAuthService } from "./firebase-auth";
import { firestoreService, UserProfile } from "./firestore-service";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfileLocal?: (profile: UserProfile | null) => void;
  updateBalance: (newBalance: number) => void;
  addToBalance: (amount: number) => void;
  deductFromBalance: (amount: number) => void;
  syncBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    try {
      const userProfile = await firestoreService.getUserProfile(uid);
      setProfile(userProfile);
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const setProfileLocal = (p: UserProfile | null) => setProfile(p);

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.uid);
    }
  };

  // Instant balance update functions
  const updateBalance = (newBalance: number) => {
    if (profile) {
      setProfile({ ...profile, balance: newBalance });
    }
  };

  const addToBalance = (amount: number) => {
    if (profile) {
      const newBalance = (profile.balance || 0) + amount;
      setProfile({ ...profile, balance: newBalance });
      console.log(`💰 Balance updated: +$${amount} → $${newBalance.toFixed(2)}`);
    }
  };

  const deductFromBalance = (amount: number) => {
    if (profile) {
      const newBalance = Math.max(0, (profile.balance || 0) - amount);
      setProfile({ ...profile, balance: newBalance });
      console.log(`💸 Balance updated: -$${amount} → $${newBalance.toFixed(2)}`);
    }
  };

  // Sync balance from Firestore (for error recovery)
  const syncBalance = async () => {
    if (user) {
      try {
        const freshProfile = await firestoreService.getUserProfile(user.uid);
        if (freshProfile && profile) {
          setProfile({ ...profile, balance: freshProfile.balance });
        }
      } catch (error) {
        console.error("Error syncing balance:", error);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    await firebaseAuthService.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signOut, 
      refreshProfile, 
      setProfileLocal,
      updateBalance,
      addToBalance,
      deductFromBalance,
      syncBalance
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // In development, this might happen due to hot reload
    if (process.env.NODE_ENV === 'development') {
      console.warn("useAuth called outside AuthProvider - this might be a hot reload issue");
      // Return a minimal context to prevent crashes during development
      return {
        user: null,
        profile: null,
        loading: true,
        signOut: async () => {},
        refreshProfile: async () => {},
        setProfileLocal: () => {},
        updateBalance: () => {},
        addToBalance: () => {},
        deductFromBalance: () => {},
        syncBalance: async () => {}
      };
    }
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
