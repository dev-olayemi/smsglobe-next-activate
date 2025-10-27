import { supabase } from "@/integrations/supabase/client";

export interface Service {
  code: string;
  name: string;
}

export interface Country {
  code: number;
  name: string;
  count: number;
  price: number;
  retail_price: number;
}

export interface Activation {
  activation_id: string;
  phone_number: string;
  status: string;
  sms_code?: string;
  sms_text?: string;
  can_get_another_sms: boolean;
}

export const smsApi = {
  async getBalance() {
    const { data, error } = await supabase.functions.invoke("sms-balance");
    if (error) throw error;
    return data;
  },

  async getServices() {
    const { data, error } = await supabase.functions.invoke("sms-services");
    if (error) throw error;
    return data as Service[];
  },

  async getCountries(service: string) {
    const { data, error } = await supabase.functions.invoke("sms-countries", {
      body: { service },
    });
    if (error) throw error;
    return data as Country[];
  },

  async buyNumber(service: string, country: number, operator?: string) {
    const { data, error } = await supabase.functions.invoke("sms-buy-number", {
      body: { service, country, operator },
    });
    if (error) throw error;
    return data as Activation;
  },

  async getStatus(activationId: string) {
    const { data, error } = await supabase.functions.invoke("sms-status", {
      body: { activation_id: activationId },
    });
    if (error) throw error;
    return data;
  },

  async cancelActivation(activationId: string) {
    const { data, error } = await supabase.functions.invoke("sms-cancel", {
      body: { activation_id: activationId },
    });
    if (error) throw error;
    return data;
  },

  async setReady(activationId: string) {
    const { data, error } = await supabase.functions.invoke("sms-set-ready", {
      body: { activation_id: activationId },
    });
    if (error) throw error;
    return data;
  },
};
