// User notification service for order updates
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  serverTimestamp,
  updateDoc,
  doc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserNotification {
  id: string;
  userId: string;
  type: 'order_completed' | 'order_processing' | 'payment_confirmed' | 'system_message';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  orderId?: string;
  orderNumber?: string;
}

class UserNotificationService {
  // Create a notification for a user
  async createNotification(notification: Omit<UserNotification, 'id' | 'createdAt' | 'isRead'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'user_notifications'), {
        ...notification,
        isRead: false,
        createdAt: serverTimestamp()
      });
      
      console.log('User notification created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating user notification:', error);
      throw error;
    }
  }

  // Notify user when order is completed
  async notifyOrderCompleted(userId: string, orderId: string, orderNumber: string, productName: string, category: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'order_completed',
        title: '🎉 Order Completed!',
        message: `Your ${category.toUpperCase()} order "${productName}" is ready! Check your order details to access your service.`,
        orderId,
        orderNumber,
        data: {
          orderId,
          orderNumber,
          productName,
          category,
          action: 'view_order'
        }
      });
      
      console.log(`Order completion notification sent to user ${userId} for order ${orderNumber}`);
    } catch (error) {
      console.error('Error sending order completion notification:', error);
    }
  }

  // Notify user when order starts processing
  async notifyOrderProcessing(userId: string, orderId: string, orderNumber: string, productName: string): Promise<void> {
    try {
      await this.createNotification({
        userId,
        type: 'order_processing',
        title: '⏳ Order Processing',
        message: `Your order "${productName}" is now being processed. You'll receive your access details soon!`,
        orderId,
        orderNumber,
        data: {
          orderId,
          orderNumber,
          productName,
          action: 'view_order'
        }
      });
    } catch (error) {
      console.error('Error sending order processing notification:', error);
    }
  }

  // Subscribe to user notifications
  subscribeToUserNotifications(userId: string, callback: (notifications: UserNotification[]) => void): () => void {
    const q = query(
      collection(db, 'user_notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as UserNotification[];

      callback(notifications);
    });

    return unsubscribe;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'user_notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all user notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'user_notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}

export const userNotificationService = new UserNotificationService();