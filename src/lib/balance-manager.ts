/* eslint-disable @typescript-eslint/no-explicit-any */
import { firestoreService, BalanceTransaction } from './firestore-service';

/**
 * Centralized Balance Management Service
 * Ensures consistent balance tracking across the application
 */
class BalanceManager {
  private static instance: BalanceManager;
  private balanceCache = new Map<string, number>();
  private transactionQueue = new Map<string, BalanceTransaction[]>();

  static getInstance(): BalanceManager {
    if (!BalanceManager.instance) {
      BalanceManager.instance = new BalanceManager();
    }
    return BalanceManager.instance;
  }

  /**
   * Get user's current balance with caching
   */
  async getCurrentBalance(userId: string): Promise<number> {
    try {
      // Check cache first
      if (this.balanceCache.has(userId)) {
        return this.balanceCache.get(userId)!;
      }

      // Fetch from Firestore
      const profile = await firestoreService.getUserProfile(userId);
      const balance = profile?.balance || 0;
      
      // Cache the result
      this.balanceCache.set(userId, balance);
      return balance;
    } catch (error) {
      console.error('Error getting current balance:', error);
      return 0;
    }
  }

  /**
   * Update balance with transaction recording
   */
  async updateBalance(
    userId: string, 
    amount: number, 
    type: 'deposit' | 'purchase' | 'refund' | 'cashback',
    description: string,
    metadata?: { txRef?: string; transactionId?: string; orderId?: string }
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      // Get current balance
      const currentBalance = await this.getCurrentBalance(userId);
      
      // Calculate new balance
      let newBalance: number;
      if (type === 'deposit' || type === 'refund' || type === 'cashback') {
        newBalance = currentBalance + Math.abs(amount);
      } else if (type === 'purchase') {
        newBalance = Math.max(0, currentBalance - Math.abs(amount));
        
        // Check if user has sufficient balance
        if (currentBalance < Math.abs(amount)) {
          return {
            success: false,
            newBalance: currentBalance,
            error: `Insufficient balance. Required: $${Math.abs(amount).toFixed(2)}, Available: $${currentBalance.toFixed(2)}`
          };
        }
      } else {
        throw new Error(`Invalid transaction type: ${type}`);
      }

      // Update balance in Firestore
      await firestoreService.updateUserBalance(userId, newBalance);

      // Record transaction
      await firestoreService.addBalanceTransaction({
        userId,
        type,
        amount: type === 'purchase' ? -Math.abs(amount) : Math.abs(amount),
        description,
        balanceAfter: newBalance,
        txRef: metadata?.txRef,
        transactionId: metadata?.transactionId || metadata?.orderId
      });

      // Update cache
      this.balanceCache.set(userId, newBalance);

      return { success: true, newBalance };
    } catch (error) {
      console.error('Error updating balance:', error);
      return {
        success: false,
        newBalance: await this.getCurrentBalance(userId),
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Process a purchase with balance deduction
   */
  async processPurchase(
    userId: string,
    amount: number,
    description: string,
    orderId?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    return this.updateBalance(userId, amount, 'purchase', description, { orderId });
  }

  /**
   * Process a deposit/top-up
   */
  async processDeposit(
    userId: string,
    amount: number,
    description: string,
    txRef?: string,
    transactionId?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    return this.updateBalance(userId, amount, 'deposit', description, { txRef, transactionId });
  }

  /**
   * Process a refund
   */
  async processRefund(
    userId: string,
    amount: number,
    description: string,
    orderId?: string
  ): Promise<{ success: boolean; newBalance: number; error?: string }> {
    return this.updateBalance(userId, amount, 'refund', description, { orderId });
  }

  /**
   * Verify balance integrity by comparing with transaction history
   */
  async verifyBalanceIntegrity(userId: string): Promise<{
    isValid: boolean;
    currentBalance: number;
    calculatedBalance: number;
    discrepancy: number;
    transactions: BalanceTransaction[];
  }> {
    try {
      // Get current balance from profile
      const profile = await firestoreService.getUserProfile(userId);
      const currentBalance = profile?.balance || 0;

      // Get all transactions
      const transactions = await firestoreService.getUserTransactions(userId);

      // Calculate balance from transactions
      let calculatedBalance = 0;
      for (const transaction of transactions.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime.getTime() - bTime.getTime();
      })) {
        calculatedBalance += transaction.amount;
      }

      const discrepancy = Math.abs(currentBalance - calculatedBalance);
      const isValid = discrepancy < 0.01; // Allow for small floating point differences

      return {
        isValid,
        currentBalance,
        calculatedBalance,
        discrepancy,
        transactions
      };
    } catch (error) {
      console.error('Error verifying balance integrity:', error);
      throw error;
    }
  }

  /**
   * Fix balance discrepancies
   */
  async fixBalanceDiscrepancy(userId: string): Promise<{ success: boolean; newBalance: number; error?: string }> {
    try {
      const verification = await this.verifyBalanceIntegrity(userId);
      
      if (verification.isValid) {
        return { success: true, newBalance: verification.currentBalance };
      }

      // Update balance to match calculated balance
      await firestoreService.updateUserBalance(userId, verification.calculatedBalance);
      
      // Update cache
      this.balanceCache.set(userId, verification.calculatedBalance);

      // Record the correction
      await firestoreService.addBalanceTransaction({
        userId,
        type: 'deposit',
        amount: verification.calculatedBalance - verification.currentBalance,
        description: `Balance correction - Fixed discrepancy of $${verification.discrepancy.toFixed(2)}`,
        balanceAfter: verification.calculatedBalance
      });

      return { success: true, newBalance: verification.calculatedBalance };
    } catch (error) {
      console.error('Error fixing balance discrepancy:', error);
      return {
        success: false,
        newBalance: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Clear cache for a user (useful after external balance changes)
   */
  clearUserCache(userId: string): void {
    this.balanceCache.delete(userId);
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.balanceCache.clear();
  }

  /**
   * Get cached balance (returns null if not cached)
   */
  getCachedBalance(userId: string): number | null {
    return this.balanceCache.get(userId) || null;
  }
}

export const balanceManager = BalanceManager.getInstance();