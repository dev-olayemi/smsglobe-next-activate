/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
  TellABotResponse, 
  NumberOrderResponse, 
  SMSCheckResponse, 
  Service,
  Country 
} from '../types/sms-types';

const API_BASE_URL = 'https://tellabot.com/api';
const API_KEY = import.meta.env.VITE_TELL_A_BOT_API_KEY;
const USERNAME = import.meta.env.VITE_TELL_A_BOT_USERNAME;

class TellABotAPI {
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<TellABotResponse<T>> {
    const url = new URL(`${API_BASE_URL}/${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.append('api_key', API_KEY);
    url.searchParams.append('username', USERNAME);
    
    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    try {
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('TellABot API Error:', error);
      throw error;
    }
  }

  // Get available services
  async getServices(): Promise<Service[]> {
    try {
      const response = await this.makeRequest<Service[]>('services');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching services:', error);
      // Fallback to local services.json
      const localResponse = await fetch('/json/services.json');
      const localData = await localResponse.json();
      return localData.message || [];
    }
  }

  // Get available countries
  async getCountries(): Promise<Country[]> {
    try {
      const response = await fetch('/countries.json');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
  }

  // Get balance
  async getBalance(): Promise<number> {
    const response = await this.makeRequest<{ balance: number }>('balance');
    return response.data?.balance || 0;
  }

  // Order a number
  async orderNumber(service: string, country: string): Promise<NumberOrderResponse> {
    const response = await this.makeRequest<NumberOrderResponse>('order', {
      service,
      country
    });
    
    if (response.status !== 'ok') {
      throw new Error(response.message || 'Failed to order number');
    }
    
    return response.data!;
  }

  // Check for SMS messages
  async checkSMS(numberId: string): Promise<SMSCheckResponse> {
    const response = await this.makeRequest<SMSCheckResponse>('sms', {
      id: numberId
    });
    
    return response.data || { messages: [] };
  }

  // Cancel number
  async cancelNumber(numberId: string): Promise<boolean> {
    const response = await this.makeRequest('cancel', {
      id: numberId
    });
    
    return response.status === 'ok';
  }

  // Get rental prices (simulated based on API documentation)
  getRentalPrices(basePrice: number) {
    return {
      '3': Math.round(basePrice * 25), // ~$5 for 3 days
      '30': Math.round(basePrice * 75)  // ~$15-20 for 30 days
    };
  }

  // Extend rental (if supported by API)
  async extendRental(numberId: string, days: number): Promise<boolean> {
    try {
      const response = await this.makeRequest('extend', {
        id: numberId,
        days
      });
      
      return response.status === 'ok';
    } catch (error) {
      console.error('Error extending rental:', error);
      return false;
    }
  }
}

export const tellaBotAPI = new TellABotAPI();