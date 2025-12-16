/* eslint-disable @typescript-eslint/no-explicit-any */
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
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  photoURL?: string;
  balance: number;
  cashback: number;
  useCashbackFirst: boolean;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  referralEarnings: number;
  apiKey?: string;
  isAdmin?: boolean;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// Referred User (for referral list)
export interface ReferredUser {
  id: string;
  email: string;
  username?: string;
  createdAt?: Timestamp | any;
}

// Balance Transaction
export interface BalanceTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'refund' | 'referral_bonus';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt?: Timestamp | any;
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
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// Deposit
export interface Deposit {
  id: string;
  userId: string;
  amountUSD: number;
  amountNGN: number;
  exchangeRate: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod: 'flutterwave' | 'crypto';
  txRef: string;
  transactionId?: string;
  createdAt?: Timestamp | any;
  completedAt?: Timestamp | any;
}

// Product Category Types
export type ProductCategory = 'esim' | 'proxy' | 'vpn' | 'rdp' | 'gift';

// Product Listing (admin-managed)
export interface ProductListing {
  [x: string]: any;
  provider: string;
  id: string;
  category: ProductCategory;
  name: string;
  description: string;
  price: number;
  features: string[];
  duration?: string; // e.g., "30 days", "1 month"
  region?: string;
  stock?: number;
  isActive: boolean;
  outOfStock?: boolean;
  slug?: string;
  imageFilename?: string; // filename stored in /assets/proxy-vpn/
  link?: string; // optional external or provider link; admin can fill
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// Product Order
export interface ProductOrder {
  id: string;
  userId: string;
  userEmail: string;
  username?: string;
  productId: string;
  productName: string;
  category: ProductCategory;
  price: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  deliveryDetails?: string; // Admin fills this with VPN credentials, eSIM details, etc.
  adminNotes?: string;
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  completedAt?: Timestamp | any;
}

// SMS Order Types
export type SMSOrderType = 'one-time' | 'long-term';
export type SMSOrderStatus = 'pending' | 'awaiting_mdn' | 'reserved' | 'active' | 'completed' | 'rejected' | 'timed_out' | 'cancelled' | 'expired';

export interface SMSOrder {
  id: string;
  userId: string;
  userEmail: string;
  username?: string;
  orderType: SMSOrderType;
  service: string;
  mdn?: string; // Mobile Directory Number
  externalId: string; // Tellabot request ID
  status: SMSOrderStatus;
  price: number; // Price with markup
  basePrice: number; // Original price from API
  markup: number; // Markup amount
  carrier?: string;
  state?: string; // For geo-targeted requests
  expiresAt?: Timestamp | any; // For long-term rentals
  autoRenew?: boolean; // For long-term rentals
  duration?: number; // Duration in days for long-term
  smsMessages?: SMSMessage[];
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
  activatedAt?: Timestamp | any;
  completedAt?: Timestamp | any;
}

export interface SMSMessage {
  id: string;
  timestamp: number;
  dateTime: string;
  from: string;
  to: string;
  service: string;
  price: number;
  reply: string;
  pin?: string;
  receivedAt: Timestamp | any;
}

export interface SMSTellabotService {
  name: string;
  price: number; // Base price
  ltr_price: number; // Long-term price
  ltr_short_price: number; // Short-term price
  available: number;
  ltr_available: number;
  recommended_markup: number;
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

  // ===== USERNAME FUNCTIONS =====
  async checkUsernameAvailable(username: string): Promise<boolean> {
    const colRef = collection(db, "users");
    const q = query(colRef, where("username", "==", username.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  },

  async setUsername(userId: string, username: string): Promise<{ success: boolean; error?: string }> {
    const isAvailable = await this.checkUsernameAvailable(username);
    if (!isAvailable) {
      return { success: false, error: "Username is already taken" };
    }
    
    await this.updateUserProfile(userId, { username: username.toLowerCase() });
    return { success: true };
  },

  async getUserByUsername(username: string): Promise<UserProfile | null> {
    const colRef = collection(db, "users");
    const q = query(colRef, where("username", "==", username.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const colRef = collection(db, "users");
    const q = query(colRef, where("email", "==", email.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  generateUsernameSuggestions(email: string, displayName?: string): string[] {
    const suggestions: string[] = [];
    const baseNames: string[] = [];
    
    // Extract from email
    const emailBase = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (emailBase.length >= 3) baseNames.push(emailBase);
    
    // Extract from display name
    if (displayName) {
      const nameBase = displayName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (nameBase.length >= 3) baseNames.push(nameBase);
      
      // First name only
      const firstName = displayName.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (firstName.length >= 3) baseNames.push(firstName);
    }
    
    // Generate suggestions with numbers
    baseNames.forEach(base => {
      suggestions.push(base);
      suggestions.push(`${base}${Math.floor(Math.random() * 999)}`);
      suggestions.push(`${base}_${Math.floor(Math.random() * 99)}`);
    });
    
    return [...new Set(suggestions)].slice(0, 5);
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

  async getUserDeposits(userId: string): Promise<Deposit[]> {
    const colRef = collection(db, "deposits");
    const q = query(
      colRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deposit));
  },

  async getDepositByTxRef(txRef: string): Promise<Deposit | null> {
    const colRef = collection(db, "deposits");
    const q = query(colRef, where("txRef", "==", txRef));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as Deposit;
    }
    return null;
  },

  async updateDeposit(depositId: string, data: Partial<Deposit>) {
    const docRef = doc(db, "deposits", depositId);
    await updateDoc(docRef, data);
  },

  // ===== COMPLETE DEPOSIT (after payment verification) =====
  async completeDeposit(depositId: string, userId: string, amountUSD: number, transactionId: string) {
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    const newBalance = (profile.balance || 0) + amountUSD;

    await this.updateDeposit(depositId, {
      status: 'completed',
      transactionId,
      completedAt: serverTimestamp() as Timestamp
    });

    await this.updateUserBalance(userId, newBalance);

    await this.addBalanceTransaction({
      userId,
      type: 'deposit',
      amount: amountUSD,
      description: `Deposit via Flutterwave`,
      balanceAfter: newBalance
    });

    return newBalance;
  },

  // ===== REFERRALS =====
  async applyReferralCode(userId: string, referralCode: string): Promise<boolean> {
    const colRef = collection(db, "users");
    const q = query(colRef, where("referralCode", "==", referralCode));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return false;
    }
    
    const referrer = snapshot.docs[0];
    const referrerId = referrer.id;
    
    if (referrerId === userId) {
      return false;
    }
    
    await this.updateUserProfile(userId, { referredBy: referrerId });
    
    const referrerData = referrer.data();
    const newReferralCount = (referrerData.referralCount || 0) + 1;
    const bonusAmount = 1;
    const newReferralEarnings = (referrerData.referralEarnings || 0) + bonusAmount;
    const newBalance = (referrerData.balance || 0) + bonusAmount;
    
    await updateDoc(doc(db, "users", referrerId), {
      referralCount: newReferralCount,
      referralEarnings: newReferralEarnings,
      balance: newBalance,
      updatedAt: serverTimestamp()
    });
    
    await this.addBalanceTransaction({
      userId: referrerId,
      type: 'referral_bonus',
      amount: bonusAmount,
      description: 'Referral bonus',
      balanceAfter: newBalance
    });
    
    return true;
  },

  async getReferredUsers(userId: string): Promise<ReferredUser[]> {
    const colRef = collection(db, "users");
    const q = query(colRef, where("referredBy", "==", userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        email: data.email || '',
        username: data.username,
        createdAt: data.createdAt
      } as ReferredUser;
    });
  },

  // ===== PRODUCT LISTINGS (Admin managed) =====
  async getProductListings(category?: ProductCategory): Promise<ProductListing[]> {
    const colRef = collection(db, "product_listings");
    let q;
    
    if (category) {
      q = query(colRef, where("category", "==", category), where("isActive", "==", true), orderBy("createdAt", "desc"));
    } else {
      q = query(colRef, where("isActive", "==", true), orderBy("createdAt", "desc"));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      return { id: docSnap.id, ...data } as ProductListing;
    });
  },

  async getAllProductListings(): Promise<ProductListing[]> {
    const colRef = collection(db, "product_listings");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data() as Record<string, any>;
      return { id: docSnap.id, ...data } as ProductListing;
    });
  },

  async getProductById(productId: string): Promise<ProductListing | null> {
    const docRef = doc(db, "product_listings", productId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductListing;
    }
    return null;
  },

  async getProductBySlug(slug: string): Promise<ProductListing | null> {
    const colRef = collection(db, "product_listings");
    const q = query(colRef, where("slug", "==", slug));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as ProductListing;
    }
    return null;
  },

  async createProductListing(product: Omit<ProductListing, 'id' | 'createdAt' | 'updatedAt'>) {
    const colRef = collection(db, "product_listings");
    const docRef = await addDoc(colRef, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async updateProductListing(productId: string, data: Partial<ProductListing>) {
    const docRef = doc(db, "product_listings", productId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteProductListing(productId: string) {
    const docRef = doc(db, "product_listings", productId);
    await deleteDoc(docRef);
  },

  // ===== PRODUCT ORDERS =====
  async createProductOrder(order: Omit<ProductOrder, 'id' | 'createdAt' | 'updatedAt'>) {
    const colRef = collection(db, "product_orders");
    const docRef = await addDoc(colRef, {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getUserProductOrders(userId: string): Promise<ProductOrder[]> {
    const colRef = collection(db, "product_orders");
    const q = query(colRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductOrder));
  },

  async getAllProductOrders(): Promise<ProductOrder[]> {
    const colRef = collection(db, "product_orders");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductOrder));
  },

  async getProductOrderById(orderId: string): Promise<ProductOrder | null> {
    const docRef = doc(db, "product_orders", orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ProductOrder;
    }
    return null;
  },

  async updateProductOrder(orderId: string, data: Partial<ProductOrder>) {
    const docRef = doc(db, "product_orders", orderId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  // ===== SMS ORDERS =====
  async createSMSOrder(order: Omit<SMSOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, "sms_orders"), {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  async getSMSOrder(orderId: string): Promise<SMSOrder | null> {
    const docRef = doc(db, "sms_orders", orderId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SMSOrder;
    }
    return null;
  },

  async getUserSMSOrders(userId: string): Promise<SMSOrder[]> {
    const colRef = collection(db, "sms_orders");
    const q = query(colRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    } as SMSOrder));
  },

  async updateSMSOrder(orderId: string, data: Partial<SMSOrder>) {
    const docRef = doc(db, "sms_orders", orderId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async addSMSMessage(orderId: string, message: Omit<SMSMessage, 'id' | 'receivedAt'>) {
    const messageId = Date.now().toString();
    const smsMessage: SMSMessage = {
      ...message,
      id: messageId,
      receivedAt: serverTimestamp()
    };

    const order = await this.getSMSOrder(orderId);
    if (!order) throw new Error("SMS order not found");

    const updatedMessages = [...(order.smsMessages || []), smsMessage];
    await this.updateSMSOrder(orderId, { smsMessages: updatedMessages });

    return smsMessage;
  },

  async getActiveSMSOrders(userId: string): Promise<SMSOrder[]> {
    const orders = await this.getUserSMSOrders(userId);
    return orders.filter(order => 
      ['pending', 'awaiting_mdn', 'reserved', 'active'].includes(order.status)
    );
  },

  // ===== PURCHASE PRODUCT =====
  async purchaseProduct(userId: string, productId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
    const profile = await this.getUserProfile(userId);
    if (!profile) return { success: false, error: "User not found" };
    
    const product = await this.getProductById(productId);
    if (!product) return { success: false, error: "Product not found" };
    if (!product.isActive) return { success: false, error: "Product is not available" };
    
    if (profile.balance < product.price) {
      return { success: false, error: "Insufficient balance" };
    }
    
    const newBalance = profile.balance - product.price;
    
    // Create order
    const orderId = await this.createProductOrder({
      userId,
      userEmail: profile.email,
      username: profile.username,
      productId,
      productName: product.name,
      category: product.category,
      price: product.price,
      status: 'pending'
    });
    
    // Deduct balance
    await this.updateUserBalance(userId, newBalance);
    
    // Record transaction
    await this.addBalanceTransaction({
      userId,
      type: 'purchase',
      amount: -product.price,
      description: `Purchase: ${product.name}`,
      balanceAfter: newBalance
    });
    
    return { success: true, orderId };
  }
};
