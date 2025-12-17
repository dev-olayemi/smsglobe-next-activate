const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const axios = require("axios");

const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || null;

async function verifyFlutterwaveTransaction(transactionId, txRef) {
  // If we don't have a secret key (or no transaction id), fall back to a mock "successful" response.
  if (!FLW_SECRET_KEY || !transactionId) {
    return {
      ok: true,
      data: {
        id: Number(transactionId) || 0,
        tx_ref: txRef,
        flw_ref: `MockFLWRef-${Date.now()}`,
        amount: 0,
        currency: "NGN",
        status: "successful",
      },
      mocked: true,
    };
  }

  try {
    const resp = await axios.get(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    });

    const payload = resp.data;
    if (!payload || payload.status !== "success" || !payload.data) {
      return { ok: false, message: payload?.message || "Flutterwave verification failed" };
    }

    const data = payload.data;
    if (txRef && data.tx_ref && String(data.tx_ref) !== String(txRef)) {
      return { ok: false, message: "Transaction reference mismatch" };
    }

    const gatewayStatus = String(data.status || "").toLowerCase();
    if (gatewayStatus !== "successful" && gatewayStatus !== "completed") {
      return { ok: false, message: `Payment not successful (${data.status})` };
    }

    return { ok: true, data, mocked: false };
  } catch (err) {
    console.error("Flutterwave verify request failed:", err?.message || err);
    return { ok: false, message: "Unable to verify payment with Flutterwave" };
  }
}

// --- Flutterwave payment verification (server updates balance + receipt) ---
app.post("/flutterwave-verify", async (req, res) => {
  try {
    const { transaction_id, tx_ref } = req.body || {};

    if (!tx_ref) {
      return res.status(400).json({ status: "error", message: "Missing tx_ref" });
    }

    const db = admin.firestore();

    // Find the deposit by txRef
    const depSnap = await db.collection("deposits").where("txRef", "==", String(tx_ref)).limit(1).get();
    if (depSnap.empty) {
      return res.status(404).json({ status: "error", message: "Deposit not found for this tx_ref" });
    }

    const depDoc = depSnap.docs[0];
    const depRef = depDoc.ref;

    // Verify with gateway (or mock)
    const verify = await verifyFlutterwaveTransaction(transaction_id, tx_ref);
    if (!verify.ok) {
      return res.status(400).json({ status: "error", message: verify.message || "Verification failed" });
    }

    const gw = verify.data || {};
    const verifiedTransactionId = String(gw.id || transaction_id || "");
    const providerRef = String(gw.flw_ref || gw.flwRef || "");

    let responsePayload = null;

    await db.runTransaction(async (t) => {
      const depFresh = await t.get(depRef);
      const deposit = depFresh.data() || {};

      const userId = deposit.userId;
      if (!userId) {
        throw new Error("Deposit is missing userId");
      }

      const amountUSD = Number(deposit.amountUSD || 0);
      const amountNGN = Number(deposit.amountNGN || deposit.amount || gw.amount || 0);
      const exchangeRate = Number(deposit.exchangeRate || 0);

      const userRef = db.collection("users").doc(String(userId));
      const userSnap = await t.get(userRef);
      const currentBalance = Number((userSnap.data() || {}).balance || 0);

      // Idempotency: if already completed, do not credit again.
      if (String(deposit.status) === "completed") {
        responsePayload = {
          status: "success",
          message: "This payment has already been processed",
          receipt: {
            txRef: String(tx_ref),
            transactionId: verifiedTransactionId,
            amountUSD,
            amountNGN,
            exchangeRate,
            providerRef,
            status: "completed",
          },
          newBalanceUSD: currentBalance,
          alreadyProcessed: true,
        };
        return;
      }

      const newBalanceUSD = currentBalance + amountUSD;

      // Update deposit
      t.update(depRef, {
        status: "completed",
        transactionId: verifiedTransactionId,
        providerRef,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user balance (USD)
      t.update(userRef, {
        balance: newBalanceUSD,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Record balance transaction
      const balTxRef = db.collection("balance_transactions").doc();
      t.set(balTxRef, {
        userId: String(userId),
        type: "deposit",
        amount: amountUSD,
        description: "Deposit via Flutterwave",
        balanceAfter: newBalanceUSD,
        txRef: String(tx_ref),
        transactionId: verifiedTransactionId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Receipt
      const payRef = db.collection("payments").doc();
      t.set(payRef, {
        userId: String(userId),
        txRef: String(tx_ref),
        transactionId: verifiedTransactionId,
        amountUSD,
        amountNGN,
        exchangeRate,
        paymentMethod: "flutterwave",
        providerRef,
        status: "completed",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      responsePayload = {
        status: "success",
        message: "Payment verified and balance updated",
        receiptId: payRef.id,
        receipt: {
          txRef: String(tx_ref),
          transactionId: verifiedTransactionId,
          amountUSD,
          amountNGN,
          exchangeRate,
          providerRef,
          status: "completed",
        },
        newBalanceUSD,
        alreadyProcessed: false,
      };
    });

    return res.json(responsePayload);
  } catch (error) {
    console.error("flutterwave-verify error:", error);
    return res.status(500).json({ status: "error", message: "Failed to verify payment" });
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
