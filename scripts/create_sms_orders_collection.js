import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../deemax-3223e-firebase-adminsdk-qg4o1-8afdc5d3b8.json'), 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://deemax-3223e-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function createSMSOrdersCollection() {
  try {
    console.log('Creating SMS Orders collection structure...');

    // Create a sample SMS order document to establish the collection
    const sampleOrder = {
      id: 'sample_sms_order',
      userId: 'sample_user_id',
      userEmail: 'user@example.com',
      username: 'sample_user',
      orderType: 'one-time', // 'one-time' | 'long-term'
      service: 'Google',
      mdn: '+1234567890', // Mobile Directory Number
      externalId: '10000001', // Tellabot request ID
      status: 'completed', // 'pending' | 'awaiting_mdn' | 'reserved' | 'active' | 'completed' | 'rejected' | 'timed_out' | 'cancelled' | 'expired'
      price: 0.75, // Price with markup
      basePrice: 0.50, // Original price from API
      markup: 0.25, // Markup amount
      carrier: 'TMobile',
      state: 'CA', // For geo-targeted requests
      expiresAt: null, // For long-term rentals
      autoRenew: false, // For long-term rentals
      duration: null, // Duration in days for long-term
      smsMessages: [], // Array of SMSMessage objects
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      activatedAt: admin.firestore.Timestamp.now(),
      completedAt: admin.firestore.Timestamp.now()
    };

    // Add the sample document
    await db.collection('sms_orders').doc('sample_sms_order').set(sampleOrder);

    // Create indexes for common queries
    console.log('SMS Orders collection created successfully!');
    console.log('Sample document added to establish collection structure.');

    // Clean up sample document
    await db.collection('sms_orders').doc('sample_sms_order').delete();
    console.log('Sample document cleaned up.');

    console.log('✅ SMS Orders collection is ready for use!');

  } catch (error) {
    console.error('Error creating SMS Orders collection:', error);
  } finally {
    process.exit(0);
  }
}

createSMSOrdersCollection();