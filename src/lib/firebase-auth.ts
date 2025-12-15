import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import { firebaseAuth, db, googleProvider } from "./firebase";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export const firebaseAuthService = {
  // Email/Password Sign Up
  async signUp(email: string, password: string, username?: string) {
    try {
      // Check username availability if provided
      if (username) {
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", username.toLowerCase())
        );
        const usernameSnapshot = await getDocs(usernameQuery);
        if (!usernameSnapshot.empty) {
          return { user: null, error: "Username is already taken" };
        }
      }

      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: username?.toLowerCase() || null,
        balance: 0,
        cashback: 0,
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

  // Email/Password Sign In (supports email OR username)
  async signIn(identifier: string, password: string) {
    try {
      let email = identifier;
      
      // Check if identifier is username (doesn't contain @)
      if (!identifier.includes('@')) {
        const usernameQuery = query(
          collection(db, "users"),
          where("username", "==", identifier.toLowerCase())
        );
        const snapshot = await getDocs(usernameQuery);
        
        if (snapshot.empty) {
          return { user: null, error: "User not found" };
        }
        
        email = snapshot.docs[0].data().email;
      }

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
          username: null,
          displayName: user.displayName,
          photoURL: user.photoURL,
          balance: 0,
          cashback: 0,
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
