const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- Flutterwave token manager ---
let accessToken = null;
let expiresIn = 0; // seconds
let lastTokenRefreshTime = 0; // ms since epoch

const FLW_CLIENT_ID = process.env.FLW_CLIENT_ID || process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || process.env.VITE_PUBLIC_FLW_PUBLIC_KEY || null;
const FLW_CLIENT_SECRET = process.env.FLW_CLIENT_SECRET || process.env.FLW_SECRET_KEY || null;

async function refreshToken() {
  try {
    if (!FLW_CLIENT_ID || !FLW_CLIENT_SECRET) {
      console.warn('Flutterwave client id/secret not configured for token refresh');
      return;
    }

    const axios = require('axios');
    const resp = await axios.post(
      'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token',
      new URLSearchParams({
        client_id: FLW_CLIENT_ID,
        client_secret: FLW_CLIENT_SECRET,
        grant_type: 'client_credentials'
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    accessToken = resp.data.access_token;
    expiresIn = resp.data.expires_in || 0;
    lastTokenRefreshTime = Date.now();
    console.log('Flutterwave token refreshed, expires in', expiresIn, 'seconds');
  } catch (err) {
    console.error('Failed to refresh Flutterwave token:', err.message);
  }
}

// --- Flutterwave payment initialization ---
app.post("/flutterwave-initialize", async (req, res) => {
  try {
    const { amount, amountUSD, email, txRef, userId, depositId, currency = 'NGN' } = req.body;

    if (!amount || !email || !txRef) {
      return res.status(400).json({ error: 'Missing required fields: amount, email, txRef' });
    }

    // Mock Flutterwave response for testing
    const mockResponse = {
      status: 'success',
      message: 'Payment initialized successfully',
      data: {
        payment_link: `https://checkout.flutterwave.com/pay/${txRef}`,
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        customer: {
          email: email,
          user_id: userId
        },
        deposit_id: depositId
      }
    };

    console.log('Flutterwave initialize called with:', { amount, email, txRef, userId });
    res.json(mockResponse);
  } catch (error) {
    console.error('Flutterwave initialize error:', error);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// --- Flutterwave payment verification ---
app.post("/flutterwave-verify", async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body;

    if (!transaction_id && !tx_ref) {
      return res.status(400).json({ error: 'Missing transaction_id or tx_ref' });
    }

    // Mock verification response that matches Flutterwave's actual response structure
    const mockResponse = {
      status: 'success',
      message: 'Payment verified successfully',
      data: {
        id: parseInt(transaction_id) || 9870093,
        tx_ref: tx_ref || 'test_tx_ref',
        flw_ref: `MockFLWRef-${Date.now()}`,
        amount: 14521.2,
        currency: 'NGN',
        charged_amount: 14521.2,
        status: 'successful',
        charge_response_code: '00',
        charge_response_message: 'Approved Successful',
        created_at: new Date().toISOString(),
        customer: {
          id: 12345,
          name: 'Test User',
          email: 'test@example.com',
          phone_number: '08012345678'
        }
      }
    };

    console.log('Flutterwave verify called with:', { transaction_id, tx_ref });

    // Attempt to update Firestore records server-side so client does not need
    // to perform sensitive balance updates. This runs for both real and mock
    // verification flows.
    try {
      const db = admin.firestore();
      if (tx_ref) {
        const q = await db.collection('deposits').where('txRef', '==', tx_ref).limit(1).get();
        if (!q.empty) {
          const doc = q.docs[0];
          const deposit = doc.data();
          if (deposit.status !== 'completed') {
            // mark deposit completed
            await doc.ref.update({ status: 'completed', transactionId: String(transaction_id || mockResponse.data.id), completedAt: admin.firestore.FieldValue.serverTimestamp() });

            // update user balance (balance stored in USD)
            const userId = deposit.userId;
            if (userId) {
              const userRef = db.collection('users').doc(userId);
              const userSnap = await userRef.get();
              const profile = userSnap.exists ? userSnap.data() : {};
              const newBalance = (profile.balance || 0) + (deposit.amountUSD || 0);
              await userRef.update({ balance: newBalance, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

              // create balance transaction
              await db.collection('balance_transactions').add({ userId, type: 'deposit', amount: deposit.amountUSD || 0, description: 'Deposit via Flutterwave', balanceAfter: newBalance, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            }

            // add payment record
            await db.collection('payments').add({ userId: deposit.userId || null, txRef: tx_ref, transactionId: String(transaction_id || mockResponse.data.id), amountUSD: deposit.amountUSD || null, amountNGN: deposit.amount || null, providerRef: mockResponse.data.flw_ref, status: 'completed', createdAt: admin.firestore.FieldValue.serverTimestamp() });
          }
        }
      }
    } catch (err) {
      console.error('Error updating Firestore during flutterwave verify:', err.message || err);
    }

    res.json(mockResponse);
  } catch (error) {
    console.error('Flutterwave verify error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// --- SMS API endpoints (mock implementations) ---
app.post("/sms-balance", async (req, res) => {
  res.json({ balance: 10.50, currency: 'USD' });
});

app.post("/sms-services", async (req, res) => {
  const mockServices = [
    { name: 'Google', price: 1.20, available: 10 },
    { name: 'Amazon', price: 1.50, available: 5 },
    { name: 'Facebook', price: 1.00, available: 15 }
  ];
  res.json(mockServices);
});

app.post("/sms-countries", async (req, res) => {
  const mockCountries = [
    { code: 'US', name: 'United States', available: true },
    { code: 'CA', name: 'Canada', available: true },
    { code: 'GB', name: 'United Kingdom', available: true }
  ];
  res.json(mockCountries);
});

app.post("/sms-buy-number", async (req, res) => {
  const { service, country } = req.body;
  const mockResponse = {
    id: '12345',
    number: '+1234567890',
    service: service,
    country: country,
    price: 1.20
  };
  res.json(mockResponse);
});

app.post("/sms-status", async (req, res) => {
  const { id } = req.body;
  const mockResponse = {
    id: id,
    status: 'active',
    sms_count: 2
  };
  res.json(mockResponse);
});

app.post("/sms-cancel", async (req, res) => {
  const { id } = req.body;
  res.json({ id, cancelled: true });
});

app.post("/sms-set-ready", async (req, res) => {
  const { id } = req.body;
  res.json({ id, ready: true });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);
