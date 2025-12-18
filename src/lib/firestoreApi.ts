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

// Resolve functions base URL with sensible defaults:
// 1. Use explicit env var if provided (but ignore localhost values when running on a hosted domain)
// 2. Use Firebase Cloud Functions default URL when running hosted
// 3. If running locally and a Firebase project id is set, point to the emulator default
// 4. Fallback to `/api` (some deployments proxy functions here)
const explicitBase =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  import.meta.env.VITE_PUBLIC_FUNCTIONS_BASE_URL ||
  import.meta.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;
const firebaseProjectId = import.meta.env.VITE_PUBLIC_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID;

const isBrowser = typeof window !== "undefined";
const hostname = isBrowser ? window.location.hostname : "";
const isLocalHost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "0.0.0.0" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("10.") ||
  hostname.startsWith("172.");

let FUNCTIONS_BASE = explicitBase || "";

// If env points to localhost but we are on a hosted domain, ignore it.
if (!isLocalHost && FUNCTIONS_BASE && /localhost|127\.0\.0\.1/.test(FUNCTIONS_BASE)) {
  FUNCTIONS_BASE = "";
}

if (!FUNCTIONS_BASE) {
  if (!isLocalHost && firebaseProjectId) {
    FUNCTIONS_BASE = `https://us-central1-${firebaseProjectId}.cloudfunctions.net/api`;
  } else if (isLocalHost && firebaseProjectId) {
    FUNCTIONS_BASE = `http://localhost:5001/${firebaseProjectId}/us-central1/api`;
  } else {
    FUNCTIONS_BASE = "/api";
  }
}

// Debug: show resolved functions base in console (helps troubleshooting during development)
try { if (typeof window !== 'undefined') console.debug('FUNCTIONS_BASE =', FUNCTIONS_BASE); } catch (e) {}

async function invokeFunction(name: string, body?: any) {
  // Dev-only local mocks: when running on localhost and the functions
  // emulator is not available, return a mock response for certain
  // function names to make local testing easier.
  try {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const enableMocks = import.meta.env.VITE_ENABLE_DEV_FUNCTION_MOCKS === 'true'; // Changed to only enable if explicitly set to 'true'
      if (enableMocks) {
        if (name === 'flutterwave-initialize') {
          return {
            data: {
              status: 'success',
              message: 'Payment initialized successfully',
              data: {
                payment_link: `https://checkout.flutterwave.com/pay/${body?.txRef || 'tx_mock'}`,
                tx_ref: body?.txRef || 'tx_mock',
                amount: body?.amount || 0,
                currency: body?.currency || 'NGN',
                customer: { email: body?.email || 'test@example.com' },
              }
            },
            error: null
          };
        }

        if (name === 'flutterwave-verify') {
          // Accept transaction_id or tx_ref
          const txRef = body?.tx_ref || body?.txRef || '';
          const txnId = body?.transaction_id || body?.transactionId || '';
          return {
            data: {
              status: 'success',
              message: 'Payment verified successfully (mock)',
              data: {
                id: parseInt(txnId) || 9870112,
                tx_ref: txRef || 'test_tx_ref',
                flw_ref: `MockFLWRef-${Date.now()}`,
                amount: 14521.2,
                currency: 'NGN',
                charged_amount: 14521.2,
                status: 'successful',
                charge_response_code: '00',
                charge_response_message: 'Approved Successful',
                created_at: new Date().toISOString(),
                customer: { id: 12345, name: 'Test User', email: 'test@example.com' }
              }
            },
            error: null
          };
        }
      }
    }
  } catch (e) {
    // ignore mock generation errors and fall back to real invocation
  }
  // Try multiple candidate endpoints in case the emulator isn't running or the proxy path differs.
  const candidates = [] as string[];
  const base = FUNCTIONS_BASE.endsWith('/') ? FUNCTIONS_BASE.slice(0, -1) : FUNCTIONS_BASE;
  // primary candidate (emulator or explicit base)
  candidates.push(`${base}/${name}`);
  // common fallback when functions are proxied under /api
  candidates.push(`/api/${name}`);
  // older path used previously
  candidates.push(`/api/functions/${name}`);
  // absolute fallback to origin + /api
  if (typeof window !== 'undefined') candidates.push(`${window.location.origin}/api/${name}`);

  let lastError: any = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });

      const text = await res.text();
      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Not a JSON response — return useful info
          return { data: null, error: { message: 'Non-JSON response from function', body: text, url } };
        }
      }

      if (!res.ok) {
        // If we got a valid response but with error status, return that immediately
        lastError = data || { message: 'Function error', status: res.status, url };
        continue;
      }

      return { data, error: null };
    } catch (err) {
      // network error (connection refused, CORS, etc.) — try next candidate
      lastError = { message: 'Network error invoking function', details: String(err), url };
      continue;
    }
  }

  return { data: null, error: lastError };
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
