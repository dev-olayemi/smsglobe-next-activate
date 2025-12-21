import { 
  SMSNumber, 
  SMSMessage, 
  NumberRequest, 
  Service, 
  Country,
  SMSOrder,
  SMSOrderType,
  SMSOrderStatus
} from '../types/sms-types';
import { tellaBotAPI } from './tellabot-api';
import { smsPricingService } from './sms-pricing-service';
import { smsSessionService } from './sms-session-service';
import { firestoreService } from '../lib/firestore-service';

class SMSService {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Get available services with pricing
  async getServices(): Promise<Array<Service & { finalPrice: number; rentalPrices: Record<string, number> }>> {
    return await smsPricingService.getAllServicesWithPricing();
  }

  // Get available countries
  async getCountries(): Promise<Country[]> {
    return await tellaBotAPI.getCountries();
  }

  // Get service with pricing for specific country
  async getServicePricing(serviceName: string, country?: string) {
    return await smsPricingService.getServiceWithPricing(serviceName, country);
  }

  // Order a new SMS number
  async orderNumber(request: NumberRequest, userId: string): Promise<{ success: boolean; orderId?: string; error?: string }> {
    try {
      // Get user profile to check balance
      const userProfile = await firestoreService.getUserProfile(userId);
      if (!userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      // Get service pricing
      const serviceWithPricing = await smsPricingService.getServiceWithPricing(request.service, request.country);
      
      let finalPrice: number;
      if (request.type === 'rental' && request.rentalDuration) {
        const rentalPrices = serviceWithPricing.rentalPrices || {};
        finalPrice = rentalPrices[request.rentalDuration.toString()] || serviceWithPricing.finalPrice;
      } else {
        finalPrice = serviceWithPricing.finalPrice;
      }

      // Check if user has sufficient balance
      if (userProfile.balance < finalPrice) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Order number from TellABot API
      const orderResponse = await tellaBotAPI.orderNumber(request.service, request.country);
      
      // Calculate expiry date
      let expiresAt = new Date();
      if (request.type === 'rental' && request.rentalDuration) {
        expiresAt.setDate(expiresAt.getDate() + request.rentalDuration);
      } else {
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes for one-time
      }

      // Create SMS order in Firestore
      const smsOrder: Omit<SMSOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        userEmail: userProfile.email,
        username: userProfile.username,
        orderType: request.type,
        service: request.service,
        mdn: orderResponse.number,
        externalId: orderResponse.id,
        status: 'active',
        price: finalPrice,
        basePrice: parseFloat(serviceWithPricing.price),
        markup: finalPrice - parseFloat(serviceWithPricing.price),
        expiresAt: expiresAt,
        duration: request.rentalDuration,
        smsMessages: []
      };

      const orderId = await firestoreService.createSMSOrder(smsOrder);

      // Deduct balance
      const newBalance = userProfile.balance - finalPrice;
      await firestoreService.updateUserBalance(userId, newBalance);

      // Add transaction record
      await firestoreService.addBalanceTransaction({
        userId,
        type: 'purchase',
        amount: -finalPrice,
        description: `SMS Number: ${request.service} (${request.country}) - ${orderResponse.number}`,
        balanceAfter: newBalance
      });

      // Create SMS number object for session
      const smsNumber: SMSNumber = {
        id: orderId,
        number: orderResponse.number,
        country: request.country,
        countryCode: request.country, // You might want to map this properly
        service: request.service,
        price: finalPrice,
        status: 'active',
        createdAt: new Date(),
        expiresAt: expiresAt,
        messages: [],
        type: request.type,
        rentalDuration: request.rentalDuration
      };

      // Add to session
      smsSessionService.addActiveNumber(smsNumber);

      // Start polling for SMS messages
      this.startPolling(orderId, orderResponse.id);

      return { success: true, orderId };

    } catch (error) {
      console.error('Error ordering SMS number:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to order number' 
      };
    }
  }

  // Start polling for SMS messages
  private startPolling(orderId: string, externalId: string): void {
    // Clear existing polling if any
    if (this.pollingIntervals.has(orderId)) {
      clearInterval(this.pollingIntervals.get(orderId)!);
    }

    const interval = setInterval(async () => {
      try {
        await this.checkForMessages(orderId, externalId);
      } catch (error) {
        console.error(`Error polling messages for ${orderId}:`, error);
      }
    }, 10000); // Poll every 10 seconds

    this.pollingIntervals.set(orderId, interval);

    // Auto-stop polling after 1 hour for one-time numbers
    setTimeout(() => {
      this.stopPolling(orderId);
    }, 60 * 60 * 1000);
  }

  // Stop polling for a specific order
  private stopPolling(orderId: string): void {
    const interval = this.pollingIntervals.get(orderId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(orderId);
    }
  }

  // Check for new SMS messages
  private async checkForMessages(orderId: string, externalId: string): Promise<void> {
    try {
      const smsResponse = await tellaBotAPI.checkSMS(externalId);
      
      if (smsResponse.messages && smsResponse.messages.length > 0) {
        // Get current order
        const order = await firestoreService.getSMSOrder(orderId);
        if (!order) return;

        // Process new messages
        for (const message of smsResponse.messages) {
          // Check if message already exists
          const existingMessage = order.smsMessages?.find(m => 
            m.from === message.from && 
            m.reply === message.text &&
            m.dateTime === message.received_at
          );

          if (!existingMessage) {
            // Add new message
            const smsMessage = await firestoreService.addSMSMessage(orderId, {
              timestamp: Date.now(),
              dateTime: message.received_at,
              from: message.from,
              to: order.mdn || '',
              service: order.service,
              price: 0,
              reply: message.text,
              pin: this.extractVerificationCode(message.text)
            });

            // Update session
            const sessionNumbers = smsSessionService.getActiveNumbers();
            const sessionNumber = sessionNumbers.find(n => n.id === orderId);
            if (sessionNumber) {
              const newMessage: SMSMessage = {
                id: smsMessage.id,
                from: message.from,
                text: message.text,
                receivedAt: new Date(message.received_at),
                code: smsMessage.pin
              };
              
              sessionNumber.messages.push(newMessage);
              smsSessionService.updateActiveNumber(orderId, { messages: sessionNumber.messages });
            }

            // If we got a verification code, mark as completed
            if (smsMessage.pin) {
              await firestoreService.updateSMSOrder(orderId, { 
                status: 'completed',
                completedAt: new Date()
              });
              
              // Update session
              smsSessionService.updateActiveNumber(orderId, { status: 'completed' });
              
              // Stop polling
              this.stopPolling(orderId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  }

  // Extract verification code from SMS text
  private extractVerificationCode(text: string): string | undefined {
    // Common patterns for verification codes
    const patterns = [
      /\b(\d{4,8})\b/g, // 4-8 digit codes
      /code[:\s]*(\d{4,8})/gi,
      /verification[:\s]*(\d{4,8})/gi,
      /confirm[:\s]*(\d{4,8})/gi,
      /pin[:\s]*(\d{4,8})/gi
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].replace(/\D/g, ''); // Extract only digits
      }
    }

    return undefined;
  }

  // Get user's SMS orders
  async getUserOrders(userId: string): Promise<SMSOrder[]> {
    return await firestoreService.getUserSMSOrders(userId);
  }

  // Get active SMS orders
  async getActiveOrders(userId: string): Promise<SMSOrder[]> {
    return await firestoreService.getActiveSMSOrders(userId);
  }

  // Cancel SMS order
  async cancelOrder(orderId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await firestoreService.getSMSOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (order.status === 'completed' || order.status === 'cancelled') {
        return { success: false, error: 'Order cannot be cancelled' };
      }

      // Try to cancel with TellABot API
      const cancelled = await tellaBotAPI.cancelNumber(order.externalId);
      
      // Update order status
      await firestoreService.updateSMSOrder(orderId, { 
        status: 'cancelled',
        updatedAt: new Date()
      });

      // Stop polling
      this.stopPolling(orderId);

      // Remove from session
      smsSessionService.removeActiveNumber(orderId);

      // Refund if cancellation was successful
      if (cancelled) {
        const userProfile = await firestoreService.getUserProfile(userId);
        if (userProfile) {
          const refundAmount = order.price * 0.8; // 80% refund
          const newBalance = userProfile.balance + refundAmount;
          
          await firestoreService.updateUserBalance(userId, newBalance);
          await firestoreService.addBalanceTransaction({
            userId,
            type: 'refund',
            amount: refundAmount,
            description: `SMS Order Cancellation Refund - ${order.service}`,
            balanceAfter: newBalance
          });
        }
      }

      return { success: true };

    } catch (error) {
      console.error('Error cancelling order:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to cancel order' 
      };
    }
  }

  // Extend rental
  async extendRental(orderId: string, additionalDays: number, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const order = await firestoreService.getSMSOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      if (order.userId !== userId) {
        return { success: false, error: 'Unauthorized' };
      }

      if (order.orderType !== 'long-term') {
        return { success: false, error: 'Only long-term rentals can be extended' };
      }

      // Calculate extension cost
      const dailyRate = order.price / (order.duration || 30);
      const extensionCost = dailyRate * additionalDays;

      // Check user balance
      const userProfile = await firestoreService.getUserProfile(userId);
      if (!userProfile || userProfile.balance < extensionCost) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Try to extend with TellABot API
      const extended = await tellaBotAPI.extendRental(order.externalId, additionalDays);
      
      if (extended) {
        // Update order
        const newExpiresAt = new Date(order.expiresAt);
        newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);
        
        await firestoreService.updateSMSOrder(orderId, {
          expiresAt: newExpiresAt,
          duration: (order.duration || 30) + additionalDays,
          updatedAt: new Date()
        });

        // Deduct balance
        const newBalance = userProfile.balance - extensionCost;
        await firestoreService.updateUserBalance(userId, newBalance);
        
        await firestoreService.addBalanceTransaction({
          userId,
          type: 'purchase',
          amount: -extensionCost,
          description: `SMS Rental Extension - ${additionalDays} days`,
          balanceAfter: newBalance
        });

        return { success: true };
      } else {
        return { success: false, error: 'Failed to extend rental with provider' };
      }

    } catch (error) {
      console.error('Error extending rental:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to extend rental' 
      };
    }
  }

  // Initialize polling for existing active orders (on app start)
  async initializePolling(userId: string): Promise<void> {
    try {
      const activeOrders = await this.getActiveOrders(userId);
      
      for (const order of activeOrders) {
        // Only start polling if order is still active and not expired
        const now = new Date();
        const expiresAt = new Date(order.expiresAt);
        
        if (expiresAt > now && order.status === 'active') {
          this.startPolling(order.id, order.externalId);
        }
      }
    } catch (error) {
      console.error('Error initializing polling:', error);
    }
  }

  // Cleanup - stop all polling
  cleanup(): void {
    for (const [orderId, interval] of this.pollingIntervals) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
  }
}

export const smsService = new SMSService();