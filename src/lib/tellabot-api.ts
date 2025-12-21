/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";

const EDGE_FUNCTION_URL = `https://cvcprxarfiiokkjjjkls.supabase.co/functions/v1/tellabot-api`;

interface ApiResponse<T> {
  status: "ok" | "error";
  data?: T;
  message?: string;
}

async function callApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data: ApiResponse<T> = await response.json();

  if (data.status === "error") {
    throw new Error(data.message || "API request failed");
  }

  return data.data as T;
}

// Service interface
export interface SMSService {
  name: string;
  basePrice: number;
  markupPrice: number;
  available: number;
  ltrPrice?: number;
  ltrMarkupPrice?: number;
  ltrShortPrice?: number;
  ltrShortMarkupPrice?: number;
  ltrAvailable?: number;
  recommendedMarkup: number;
}

// Request result interface
export interface SMSRequestResult {
  externalId: string;
  mdn: string | null;
  service: string;
  status: string;
  state?: string;
  markup: number;
  basePrice: number;
  markupPrice: number;
  carrier?: string;
  tillExpiration: number;
}

// SMS message interface
export interface SMSMessage {
  timestamp: number;
  dateTime: string;
  from: string;
  to: string;
  service: string;
  price: number;
  text: string;
  pin?: string;
}

// LTR result interface
export interface LTRResult {
  externalId: string;
  mdn: string | null;
  service: string;
  basePrice: number;
  markupPrice: number;
  carrier?: string;
  expires?: string;
}

// LTR status interface
export interface LTRStatus {
  ltrStatus: "online" | "offline" | "awaiting_mdn";
  mdn?: string;
  tillChange: number;
  nextOnline: number;
  timestamp: number;
  dateTime: string;
}

export const tellabotApi = {
  // ===== BALANCE & SERVICES =====
  async getBalance(): Promise<number> {
    const result = await callApi<{ balance: number }>("balance");
    return result.balance;
  },

  async getServices(): Promise<SMSService[]> {
    const result = await callApi<{ services: SMSService[] }>("list_services");
    return result.services;
  },

  // ===== ONE-TIME MDN =====
  async requestMDN(
    service: string,
    options?: { mdn?: string; areacode?: string; state?: string; markup?: number }
  ): Promise<SMSRequestResult> {
    return callApi<SMSRequestResult>("request_mdn", { service, ...options });
  },

  async getRequestStatus(id: string): Promise<SMSRequestResult> {
    return callApi<SMSRequestResult>("request_status", { id });
  },

  async rejectMDN(id: string): Promise<{ success: boolean; message: string }> {
    return callApi<{ success: boolean; message: string }>("reject_mdn", { id });
  },

  async readSMS(options: {
    id?: string;
    ltr_id?: string;
    mdn?: string;
    service?: string;
  }): Promise<SMSMessage[]> {
    const result = await callApi<{ messages: SMSMessage[] }>("read_sms", options);
    return result.messages;
  },

  async sendSMS(mdn: string, to: string, text: string): Promise<{ success: boolean; message: string }> {
    return callApi<{ success: boolean; message: string }>("send_sms", { mdn, to, text });
  },

  // ===== LONG-TERM RENTALS =====
  async rentLTR(service: string, duration: number = 30): Promise<LTRResult> {
    return callApi<LTRResult>("ltr_rent", { service, duration: duration.toString() });
  },

  async getLTRStatus(options: { ltr_id?: string; mdn?: string }): Promise<LTRStatus> {
    return callApi<LTRStatus>("ltr_status", options);
  },

  async activateLTR(mdn: string): Promise<LTRStatus> {
    return callApi<LTRStatus>("ltr_activate", { mdn });
  },

  async releaseLTR(options: { ltr_id?: string; mdn?: string; service?: string }): Promise<{ success: boolean }> {
    return callApi<{ success: boolean }>("ltr_release", options);
  },

  async setAutoRenew(
    options: { ltr_id?: string; mdn?: string; service?: string },
    autorenew?: boolean
  ): Promise<{ success: boolean; message: string }> {
    return callApi<{ success: boolean; message: string }>("ltr_autorenew", {
      ...options,
      autorenew: autorenew?.toString(),
    });
  },

  async reportMDN(mdn: string): Promise<{ success: boolean }> {
    return callApi<{ success: boolean }>("ltr_report", { mdn });
  },

  async switchService(ltr_id: string, service: string): Promise<{ success: boolean; message: string }> {
    return callApi<{ success: boolean; message: string }>("ltr_switch_service", { ltr_id, service });
  },
};
