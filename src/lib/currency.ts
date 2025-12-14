// Currency conversion utilities

// Default exchange rate (fallback if API fails)
const DEFAULT_USD_TO_NGN_RATE = 1550;

// Cache the rate for 10 minutes
let cachedRate: number | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export interface ExchangeRateResult {
  rate: number;
  source: 'api' | 'cache' | 'fallback';
}

/**
 * Fetches the current USD to NGN exchange rate
 * Uses a free API and caches the result
 */
export async function getUsdToNgnRate(): Promise<ExchangeRateResult> {
  const now = Date.now();
  
  // Return cached rate if still valid
  if (cachedRate && (now - cacheTimestamp) < CACHE_DURATION) {
    return { rate: cachedRate, source: 'cache' };
  }
  
  try {
    // Using exchangerate-api.com free tier
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }
    
    const data = await response.json();
    const rate = data.rates?.NGN;
    
    if (rate && typeof rate === 'number') {
      cachedRate = rate;
      cacheTimestamp = now;
      return { rate, source: 'api' };
    }
    
    throw new Error('Invalid rate data');
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    
    // Return cached rate if available, even if expired
    if (cachedRate) {
      return { rate: cachedRate, source: 'cache' };
    }
    
    // Return default rate as last resort
    return { rate: DEFAULT_USD_TO_NGN_RATE, source: 'fallback' };
  }
}

/**
 * Convert USD to NGN
 */
export function usdToNgn(usdAmount: number, rate: number): number {
  return Math.round(usdAmount * rate * 100) / 100;
}

/**
 * Convert NGN to USD
 */
export function ngnToUsd(ngnAmount: number, rate: number): number {
  return Math.round((ngnAmount / rate) * 100) / 100;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: 'USD' | 'NGN' = 'USD'): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
