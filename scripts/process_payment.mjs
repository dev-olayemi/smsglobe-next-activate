#!/usr/bin/env node
// Script to process a payment record and update user balance.
// Usage: node scripts/process_payment.mjs <tx_ref> <user_id> <amount_usd> <amount_ngn> <exchange_rate> [transaction_id] [flw_ref]

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

function initAdmin() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const svcPath = path.resolve(__dirname, '..', 'deemax-3223e-firebase-adminsdk-qg4o1-8afdc5d3b8.json');
  if (fs.existsSync(svcPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(svcPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('Initialized admin with service account');
  } else {
    admin.initializeApp();
    console.log('Initialized admin with default credentials');
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.error('Usage: node scripts/process_payment.mjs <tx_ref> <user_id> <amount_usd> <amount_ngn> <exchange_rate> [transaction_id] [flw_ref]');
    process.exit(1);
  }

  const [txRef, userId, amountUSDStr, amountNGNStr, exchangeRateStr, transactionId = '', flwRef = ''] = args;
  const amountUSD = parseFloat(amountUSDStr);
  const amountNGN = parseFloat(amountNGNStr);
  const exchangeRate = parseFloat(exchangeRateStr);

  initAdmin();
  const db = admin.firestore();

  try {
    // Check if payment already exists
    const paymentsRef = db.collection('payments');
    const existingPayment = await paymentsRef.where('txRef', '==', txRef).get();
    if (!existingPayment.empty) {
      console.log('Payment already processed');
      return;
    }

    // Check or create deposit record
    const depositsRef = db.collection('deposits');
    let depositDoc = await depositsRef.where('txRef', '==', txRef).get();
    let depositId;
    if (depositDoc.empty) {
      // Create deposit if not exists
      const depositData = {
        txRef,
        userId,
        amountUSD,
        amountNGN,
        exchangeRate,
        status: 'pending',
        paymentMethod: 'flutterwave',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      const newDeposit = await depositsRef.add(depositData);
      depositId = newDeposit.id;
      console.log('Created deposit record');
    } else {
      depositId = depositDoc.docs[0].id;
    }

    // Update deposit status to completed
    await depositsRef.doc(depositId).update({
      status: 'completed',
      transactionId,
      flwRef,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get current user balance
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      console.error('User not found');
      return;
    }
    const userData = userDoc.data();
    const previousBalance = userData?.balance || 0;
    const newBalance = previousBalance + amountUSD;

    // Update user balance
    await userRef.update({
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastBalanceChangedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add payment record
    await paymentsRef.add({
      txRef,
      transactionId,
      flwRef,
      amountUSD,
      amountNGN,
      exchangeRate,
      status: 'completed',
      userId,
      depositId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Add balance transaction
    await db.collection('balance_transactions').add({
      userId,
      type: 'deposit',
      amount: amountUSD,
      currency: 'USD',
      description: `Top-up via Flutterwave (${txRef})`,
      previousBalance,
      newBalance,
      txRef,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Payment processed successfully. Balance updated from ${previousBalance} to ${newBalance} USD`);
  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

main();