import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  balance: number;
  useCashbackFirst: boolean;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  referralEarnings: number;
  apiKey?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Balance Transaction
export interface BalanceTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'refund' | 'referral_bonus';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: Timestamp;
}

// Activation/Order
export interface Activation {
  id: string;
  userId: string;
  service: string;
  country: string;
  phoneNumber: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  smsCode?: string;
  price: number;
  externalId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Deposit
export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  txRef: string;
  transactionId?: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export const firestoreService = {
  // ===== USER PROFILE =====
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  async updateUserProfile(userId: string, data: Partial<UserProfile>) {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async updateUserBalance(userId: string, newBalance: number) {
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, {
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
  },

  // ===== BALANCE TRANSACTIONS =====
  async addBalanceTransaction(transaction: Omit<BalanceTransaction, 'id' | 'createdAt'>) {
    const colRef = collection(db, "balance_transactions");
    const docRef = await addDoc(colRef, {
      ...transaction,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getUserTransactions(userId: string): Promise<BalanceTransaction[]> {
    const colRef = collection(db, "balance_transactions");
    const q = query(
      colRef, 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BalanceTransaction));
  },

  // ===== ACTIVATIONS/ORDERS =====
  async createActivation(activation: Omit<Activation, 'id' | 'createdAt' | 'updatedAt'>) {
    const colRef = collection(db, "activations");
    const docRef = await addDoc(colRef, {
      ...activation,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getUserActivations(userId: string): Promise<Activation[]> {
    const colRef = collection(db, "activations");
    const q = query(
      colRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Activation));
  },

  async updateActivation(activationId: string, data: Partial<Activation>) {
    const docRef = doc(db, "activations", activationId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // ===== DEPOSITS =====
  async createDeposit(deposit: Omit<Deposit, 'id' | 'createdAt'>) {
    const colRef = collection(db, "deposits");
    const docRef = await addDoc(colRef, {
      ...deposit,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getDepositByTxRef(txRef: string): Promise<Deposit | null> {
    const colRef = collection(db, "deposits");
    const q = query(colRef, where("txRef", "==", txRef));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Deposit;
    }
    return null;
  },

  async updateDeposit(depositId: string, data: Partial<Deposit>) {
    const docRef = doc(db, "deposits", depositId);
    await updateDoc(docRef, data);
  },

  // ===== REFERRALS =====
  async applyReferralCode(userId: string, referralCode: string): Promise<boolean> {
    // Find user with this referral code
    const colRef = collection(db, "users");
    const q = query(colRef, where("referralCode", "==", referralCode));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    const referrer = snapshot.docs[0];
    const referrerId = referrer.id;
    
    // Don't allow self-referral
    if (referrerId === userId) {
      return false;
    }
    
    // Update current user's referredBy
    await this.updateUserProfile(userId, { referredBy: referrerId });
    
    // Update referrer's stats and give bonus
    const referrerData = referrer.data();
    const newReferralCount = (referrerData.referralCount || 0) + 1;
    const bonusAmount = 1; // $1 bonus
    const newReferralEarnings = (referrerData.referralEarnings || 0) + bonusAmount;
    const newBalance = (referrerData.balance || 0) + bonusAmount;
    
    await updateDoc(doc(db, "users", referrerId), {
      referralCount: newReferralCount,
      referralEarnings: newReferralEarnings,
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
    
    // Add balance transaction for referrer
    await this.addBalanceTransaction({
      userId: referrerId,
      type: 'referral_bonus',
      amount: bonusAmount,
      description: 'Referral bonus',
      balanceAfter: newBalance
    });
    
    return true;
  }
};
