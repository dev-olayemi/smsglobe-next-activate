import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

const FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  import.meta.env.VITE_PUBLIC_FUNCTIONS_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL ||
  "/api/functions";

async function invokeFunction(name: string, body?: any) {
  try {
    const url = `${FUNCTIONS_BASE}/${name}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    // Some endpoints may return empty bodies or non-JSON (404 pages). Read text first.
    const text = await res.text();
    let data: any = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        // Not a JSON response
        return { data: null, error: { message: 'Non-JSON response from function', body: text } };
      }
    }

    if (!res.ok) return { data: null, error: data || { message: 'Function error', status: res.status } };
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export const firestoreApi = {
  invokeFunction,

  async getUserProfile(userId: string) {
    if (!userId) return null;
    const d = await getDoc(doc(db, "users", userId));
    return d.exists() ? d.data() : null;
  },

  async updateUserProfile(userId: string, data: Record<string, any>) {
    if (!userId) throw new Error("userId required");
    const ref = doc(db, "users", userId);
    await updateDoc(ref, { ...data, last_updated: serverTimestamp() });
    return true;
  },

  async getActivationsByUser(userId: string) {
    const q = query(
      collection(db, "activations"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getServices() {
    const snap = await getDocs(collection(db, "services"));
    return snap.docs.map((d) => d.data());
  },

  async getCountries(service?: string) {
    if (service) {
      const q = query(collection(db, "countries"), where("service", "==", service));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data());
    }
    const snap = await getDocs(collection(db, "countries"));
    return snap.docs.map((d) => d.data());
  },

  async getUserTransactions(userId: string) {
    const q = query(collection(db, "balance_transactions"), where("user_id", "==", userId), orderBy("created_at", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getUserDeposits(userId: string) {
    const q = query(collection(db, "userDeposits"), where("userId", "==", userId), orderBy("date", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async addUserDeposit(deposit: Record<string, any>) {
    await addDoc(collection(db, "userDeposits"), { ...deposit, date: serverTimestamp() });
  },

  async addOrder(order: Record<string, any>) {
    return await addDoc(collection(db, "orders"), { ...order, status: order.status || 'pending', createdAt: serverTimestamp() });
  },

  async getOrdersByUser(userId: string) {
    const q = query(collection(db, "orders"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default firestoreApi;
