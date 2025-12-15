/**
 * Minimal Firebase Functions Express app to host the previous Supabase Functions
 * endpoints in a Firebase Functions environment.
 *
 * This file provides mocked / minimal implementations for:
 * - POST /flutterwave-initialize
 * - POST /flutterwave-verify
 * - POST /sms-*: sms-balance, sms-services, sms-countries, sms-buy-number, sms-status, sms-cancel, sms-set-ready
 *
 * These endpoints are intentionally simple so you can test the frontend integration locally
 * and then replace the mocks with real provider logic (Flutterwave, SMS provider).
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Helper: create a mock payment link
function makePaymentLink(txRef) {
  return `https://checkout.flutterwave.com/pay/${encodeURIComponent(txRef)}`;
}

app.post("/flutterwave-initialize", async (req, res) => {
  try {
    const { amount, amountUSD, email, txRef, userId, depositId, currency } = req.body || {};

    const FLW_SECRET = process.env.FLW_SECRET_KEY || (functions.config && functions.config().flutterwave && functions.config().flutterwave.key) || "";
    if (!FLW_SECRET) {
      console.warn("Flutterwave secret not set (FLW_SECRET_KEY)");
    }

    // Build payload for Flutterwave hosted payment
    const frontendRedirect = process.env.FRONTEND_URL || process.env.VITE_PUBLIC_APP_URL || "http://localhost:8080";
    const payload = {
      tx_ref: txRef || `txn_${Date.now()}`,
      amount: amount || amountUSD || 0,
      currency: currency || 'NGN',
      redirect_url: `${frontendRedirect}/payment-callback`,
      customer: {
        email: email || (userId ? `${userId}@example.com` : "no-reply@example.com"),
      },
      customizations: {
        title: "SMSGlobe Top Up",
        description: "Top up account balance"
      }
    };

    // Call Flutterwave Payments API
    const fwRes = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const fwData = await fwRes.json().catch(() => null);

    // Save initialization metadata
    if (depositId) {
      await db.collection("payment_initializations").doc(payload.tx_ref)
        .set({ amount, amountUSD, email, txRef: payload.tx_ref, userId, depositId, currency, createdAt: admin.firestore.FieldValue.serverTimestamp(), fwResponse: fwData });
    }

    // Try to use a hosted payment link if available, otherwise return the raw flutterwave response
    const payment_link = fwData && fwData.data && (fwData.data.link || fwData.data.checkout_url || fwData.data.flw || fwData.data.payment_link) ? (fwData.data.link || fwData.data.checkout_url || fwData.data.payment_link) : null;

    return res.json({ payment_link, raw: fwData });
  } catch (err) {
    console.error("/flutterwave-initialize error:", err);
    return res.status(500).json({ error: "initialize_failed", details: err.message || err });
  }
});

app.post("/flutterwave-verify", async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body || {};
    const FLW_SECRET = process.env.FLW_SECRET_KEY || (functions.config && functions.config().flutterwave && functions.config().flutterwave.key) || "";
    if (!FLW_SECRET) {
      console.warn("Flutterwave secret not set (FLW_SECRET_KEY)");
    }

    let verifyUrl = null;
    if (transaction_id) {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`;
    } else if (tx_ref) {
      verifyUrl = `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx_ref)}`;
    } else {
      return res.status(400).json({ error: "missing_transaction_identifier" });
    }

    const fwRes = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
      },
    });

    const fwData = await fwRes.json().catch(() => null);

    // If verification succeeded, optionally update deposit & user balance in Firestore
    try {
      const status = fwData && fwData.status === "successful" || (fwData && fwData.data && fwData.data.status === "successful");
      const amountUSD = (fwData && fwData.data && fwData.data.amount) || null;
      const txId = (fwData && fwData.data && fwData.data.id) || transaction_id || null;
      const txRefFound = (fwData && fwData.data && fwData.data.tx_ref) || tx_ref || null;

      if (status && txRefFound) {
        // try to find deposit by txRef
        const deposits = await db.collection('deposits').where('txRef', '==', txRefFound).limit(1).get();
        if (!deposits.empty) {
          const depositDoc = deposits.docs[0];
          const depositData = depositDoc.data();
          if (depositData.status !== 'completed') {
            // mark deposit completed
            await depositDoc.ref.update({ status: 'completed', transactionId: txId, completedAt: admin.firestore.FieldValue.serverTimestamp() });

            // update user balance
            if (depositData.userId) {
              const userRef = db.collection('users').doc(depositData.userId);
              const userSnap = await userRef.get();
              if (userSnap.exists) {
                const userData = userSnap.data();
                const newBalance = (userData.balance || 0) + (amountUSD || depositData.amountUSD || 0);
                await userRef.update({ balance: newBalance });

                // add balance transaction
                await db.collection('balance_transactions').add({
                  userId: depositData.userId,
                  type: 'deposit',
                  amount: amountUSD || depositData.amountUSD || 0,
                  description: 'Deposit via Flutterwave',
                  balanceAfter: newBalance,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }
          }
        }
      }
    } catch (innerErr) {
      console.error('Error updating deposit/user after verification', innerErr);
    }

    return res.json({ status: fwData && fwData.status, data: fwData });
  } catch (err) {
    console.error("/flutterwave-verify error:", err);
    return res.status(500).json({ error: "verify_failed", details: err.message || err });
  }
});

// SMS related endpoints (mocked)
app.post("/sms-balance", async (req, res) => {
  return res.json({ balance: 100.0 });
});

app.post("/sms-services", async (req, res) => {
  // Return a small set of example services
  return res.json([
    { code: "sms", name: "SMS Activation" },
    { code: "voice", name: "Voice Activation" }
  ]);
});

app.post("/sms-countries", async (req, res) => {
  const { service } = req.body || {};
  // Example country list
  return res.json([
    { code: 1, name: "United States", count: 10, price: 0.5 },
    { code: 2, name: "United Kingdom", count: 5, price: 1.0 }
  ]);
});

app.post("/sms-buy-number", async (req, res) => {
  const { service, country, operator } = req.body || {};
  // Simulate a purchased activation
  const activation = {
    activation_id: `act_${Date.now()}`,
    phone_number: "+1234567890",
    status: "active",
    sms_code: null,
    sms_text: null,
    can_get_another_sms: true,
  };
  return res.json(activation);
});

app.post("/sms-status", async (req, res) => {
  const { activation_id } = req.body || {};
  return res.json({ activation_id, status: "active", sms_code: null, sms_text: null });
});

app.post("/sms-cancel", async (req, res) => {
  const { activation_id } = req.body || {};
  return res.json({ activation_id, cancelled: true });
});

app.post("/sms-set-ready", async (req, res) => {
  const { activation_id } = req.body || {};
  return res.json({ activation_id, ready: true });
});

exports.api = functions.https.onRequest(app);
