import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { firebaseAuth, db, googleProvider } from "./firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export const firebaseAuthService = {
  // Email/Password Sign Up
  async signUp(email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        balance: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        useCashbackFirst: true,
        referralCode: generateReferralCode(),
        referredBy: null,
        referralCount: 0,
        referralEarnings: 0
      });
      
      return { user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Email/Password Sign In
  async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error: any) {
      return { user: null, error: error.message };
    }
  },

  // Google Sign In
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      
      // Check if user profile exists, if not create one
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          balance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          useCashbackFirst: true,
          referralCode: generateReferralCode(),
          referredBy: null,
          referralCount: 0,
          referralEarnings: 0
        });
      }
      
      return { user, error: null };
    } catch (error: any) {
      // Popup may be blocked or network issues may prevent the popup flow.
      // Fall back to redirect flow which uses the same Firebase auth handler.
      try {
        await signInWithRedirect(firebaseAuth, googleProvider);
        return { user: null, error: null };
      } catch (err: any) {
        return { user: null, error: (err && err.message) || error?.message || 'Google sign-in failed' };
      }
    }
  },

  // Sign Out
  async signOut() {
    try {
      await signOut(firebaseAuth);
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return firebaseAuth.currentUser;
  },

  // Auth state listener
  onAuthStateChange(callback: (user: User | null) => void) {
    return firebaseAuth.onAuthStateChanged(callback);
  }
};

// Generate a random referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
