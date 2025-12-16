/* eslint-disable @typescript-eslint/no-explicit-any */
import { callTellabotAPI, SMSService, TellabotResponse } from "./utils";

// Balance & Services API
export const balanceApi = {
  // Get user balance from Tellabot
  async getTellabotBalance(): Promise<number> {
    const response = await callTellabotAPI({ cmd: 'balance' });
    
    if (response.status === 'error') {
      throw new Error(`Failed to get balance: ${response.message}`);
    }
    
    const balance = parseFloat(response.message);
    if (isNaN(balance)) {
      throw new Error('Invalid balance response from provider');
    }
    
    return balance;
  },

  // List available services
  async getServices(serviceNames?: string[]): Promise<SMSService[]> {
    const params: any = { cmd: 'list_services' };
    if (serviceNames && serviceNames.length > 0) {
      params.service = serviceNames.join(',');
    }
    
    const response = await callTellabotAPI(params);
    
    if (response.status === 'error') {
      throw new Error(`Failed to get services: ${response.message}`);
    }
    
    if (!Array.isArray(response.message)) {
      throw new Error('Invalid services response format');
    }
    
    return response.message.map((service: any) => ({
      name: service.name,
      displayName: service.name,
      basePrice: parseFloat(service.price),
      markupPrice: calculateMarkupPrice(parseFloat(service.price)),
      ltrPrice: service.ltr_price ? parseFloat(service.ltr_price) : undefined,
      ltrMarkupPrice: service.ltr_price ? calculateMarkupPrice(parseFloat(service.ltr_price)) : undefined,
      ltrShortPrice: service.ltr_short_price ? parseFloat(service.ltr_short_price) : undefined,
      ltrShortMarkupPrice: service.ltr_short_price ? calculateMarkupPrice(parseFloat(service.ltr_short_price)) : undefined,
      available: parseInt(service.available),
      ltrAvailable: service.ltr_available ? parseInt(service.ltr_available) : undefined,
      recommendedMarkup: parseInt(service.recommended_markup)
    }));
  }
};

// Re-export calculateMarkupPrice for use in other files
import { calculateMarkupPrice } from "./utils";
export { calculateMarkupPrice };