import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const TELLABOT_API_URL = "https://www.tellabot.com/sims/api_command.php";
const TELLABOT_USERNAME = Deno.env.get("TELLABOT_USERNAME");
const TELLABOT_API_KEY = Deno.env.get("TELLABOT_API_KEY");
const MARKUP_PERCENTAGE = 0.5; // 50% markup

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TellabotResponse {
  status: "ok" | "error";
  message: unknown;
}

function calculateMarkupPrice(basePrice: number): number {
  return Math.round(basePrice * (1 + MARKUP_PERCENTAGE) * 100) / 100;
}

async function callTellabotAPI(params: Record<string, string>): Promise<TellabotResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append("user", TELLABOT_USERNAME || "");
  searchParams.append("api_key", TELLABOT_API_KEY || "");
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value.toString());
    }
  });

  console.log(`Calling TellaBot API: cmd=${params.cmd}`);
  
  const response = await fetch(`${TELLABOT_API_URL}?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data: TellabotResponse = await response.json();
  console.log(`TellaBot Response:`, JSON.stringify(data).substring(0, 500));
  
  return data;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log(`SMS API Action: ${action}`, params);

    let result: unknown;

    switch (action) {
      // ===== BALANCE & SERVICES =====
      case "balance": {
        const response = await callTellabotAPI({ cmd: "balance" });
        if (response.status === "error") {
          throw new Error(`Failed to get balance: ${response.message}`);
        }
        result = { balance: parseFloat(response.message as string) };
        break;
      }

      case "list_services": {
        const response = await callTellabotAPI({ cmd: "list_services" });
        if (response.status === "error") {
          throw new Error(`Failed to list services: ${response.message}`);
        }
        // Apply markup to prices
        const services = (response.message as Array<{
          name: string;
          price: string;
          available: string;
          ltr_price?: string;
          ltr_short_price?: string;
          ltr_available?: string;
          recommended_markup?: string;
        }>).map((s) => ({
          name: s.name,
          basePrice: parseFloat(s.price),
          markupPrice: calculateMarkupPrice(parseFloat(s.price)),
          available: parseInt(s.available || "0"),
          ltrPrice: s.ltr_price ? parseFloat(s.ltr_price) : undefined,
          ltrMarkupPrice: s.ltr_price ? calculateMarkupPrice(parseFloat(s.ltr_price)) : undefined,
          ltrShortPrice: s.ltr_short_price ? parseFloat(s.ltr_short_price) : undefined,
          ltrShortMarkupPrice: s.ltr_short_price ? calculateMarkupPrice(parseFloat(s.ltr_short_price)) : undefined,
          ltrAvailable: s.ltr_available ? parseInt(s.ltr_available) : undefined,
          recommendedMarkup: s.recommended_markup ? parseInt(s.recommended_markup) : 0,
        }));
        result = { services };
        break;
      }

      // ===== ONE-TIME MDN =====
      case "request_mdn": {
        const { service, mdn, areacode, state, markup } = params;
        const apiParams: Record<string, string> = { cmd: "request", service };
        if (mdn) apiParams.mdn = mdn;
        if (areacode) apiParams.areacode = areacode;
        if (state) apiParams.state = state;
        if (markup) apiParams.markup = markup;

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          throw new Error(response.message as string);
        }

        const requestData = (response.message as Array<{
          id: string;
          mdn: string;
          service: string;
          status: string;
          state?: string;
          markup: number;
          price: number;
          carrier?: string;
          till_expiration: number;
        }>)[0];

        result = {
          externalId: requestData.id,
          mdn: requestData.mdn || null,
          service: requestData.service,
          status: mapStatus(requestData.status),
          state: requestData.state,
          markup: requestData.markup,
          basePrice: requestData.price,
          markupPrice: calculateMarkupPrice(requestData.price),
          carrier: requestData.carrier,
          tillExpiration: requestData.till_expiration,
        };
        break;
      }

      case "request_status": {
        const { id } = params;
        const response = await callTellabotAPI({ cmd: "request_status", id });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }

        const statusData = (response.message as Array<{
          id: string;
          mdn: string;
          service: string;
          status: string;
          state?: string;
          markup: number;
          carrier?: string;
          till_expiration: number;
        }>)[0];

        result = {
          externalId: statusData.id,
          mdn: statusData.mdn || null,
          service: statusData.service,
          status: mapStatus(statusData.status),
          state: statusData.state,
          markup: statusData.markup,
          carrier: statusData.carrier,
          tillExpiration: statusData.till_expiration,
        };
        break;
      }

      case "reject_mdn": {
        const { id } = params;
        const response = await callTellabotAPI({ cmd: "reject", id });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true, message: response.message };
        break;
      }

      case "read_sms": {
        const { id, ltr_id, mdn, service } = params;
        const apiParams: Record<string, string> = { cmd: "read_sms" };
        if (id) apiParams.id = id;
        if (ltr_id) apiParams.ltr_id = ltr_id;
        if (mdn) apiParams.mdn = mdn;
        if (service) apiParams.service = service;

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          // No messages is not an error, return empty array
          if ((response.message as string).toLowerCase().includes("no messages")) {
            result = { messages: [] };
            break;
          }
          throw new Error(response.message as string);
        }

        const messages = (response.message as Array<{
          timestamp: string;
          date_time: string;
          from: string;
          to: string;
          service: string;
          price: number;
          reply: string;
          pin?: string;
        }>).map((m) => ({
          timestamp: parseInt(m.timestamp),
          dateTime: m.date_time,
          from: m.from,
          to: m.to,
          service: m.service,
          price: m.price,
          text: m.reply,
          pin: m.pin,
        }));

        result = { messages };
        break;
      }

      case "send_sms": {
        const { mdn, to, text } = params;
        const response = await callTellabotAPI({ cmd: "send_sms", mdn, to, text });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true, message: response.message };
        break;
      }

      // ===== LONG-TERM RENTALS =====
      case "ltr_rent": {
        const { service, duration } = params;
        const apiParams: Record<string, string> = { 
          cmd: "ltr_rent", 
          service, 
          duration: duration || "30" 
        };

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          throw new Error(response.message as string);
        }

        const rentData = response.message as {
          id: string;
          mdn: string;
          service: string;
          price: number;
          carrier?: string;
          expires?: string;
        };

        result = {
          externalId: rentData.id,
          mdn: rentData.mdn || null,
          service: rentData.service,
          basePrice: rentData.price,
          markupPrice: calculateMarkupPrice(rentData.price),
          carrier: rentData.carrier,
          expires: rentData.expires,
        };
        break;
      }

      case "ltr_status": {
        const { ltr_id, mdn } = params;
        const apiParams: Record<string, string> = { cmd: "ltr_status" };
        if (ltr_id) apiParams.ltr_id = ltr_id;
        if (mdn) apiParams.mdn = mdn;

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          throw new Error(response.message as string);
        }

        const statusData = response.message as {
          ltr_status: string;
          mdn?: string;
          till_change?: number;
          next_online?: number;
          timestamp?: number;
          date_time?: string;
        };

        result = {
          ltrStatus: statusData.ltr_status,
          mdn: statusData.mdn,
          tillChange: statusData.till_change || 0,
          nextOnline: statusData.next_online || 0,
          timestamp: statusData.timestamp || 0,
          dateTime: statusData.date_time || "",
        };
        break;
      }

      case "ltr_activate": {
        const { mdn } = params;
        const response = await callTellabotAPI({ cmd: "ltr_activate", mdn });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }

        const activateData = response.message as {
          ltr_status: string;
          till_change?: number;
          next_online?: number;
          timestamp?: number;
          date_time?: string;
        };

        result = {
          ltrStatus: activateData.ltr_status,
          tillChange: activateData.till_change || 0,
          nextOnline: activateData.next_online || 0,
          timestamp: activateData.timestamp || 0,
          dateTime: activateData.date_time || "",
        };
        break;
      }

      case "ltr_release": {
        const { ltr_id, mdn, service } = params;
        const apiParams: Record<string, string> = { cmd: "ltr_release" };
        if (ltr_id) apiParams.ltr_id = ltr_id;
        if (mdn) apiParams.mdn = mdn;
        if (service) apiParams.service = service;

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true };
        break;
      }

      case "ltr_autorenew": {
        const { ltr_id, mdn, service, autorenew } = params;
        const apiParams: Record<string, string> = { cmd: "ltr_autorenew" };
        if (ltr_id) apiParams.ltr_id = ltr_id;
        if (mdn) apiParams.mdn = mdn;
        if (service) apiParams.service = service;
        if (autorenew !== undefined) apiParams.autorenew = autorenew;

        const response = await callTellabotAPI(apiParams);
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true, message: response.message };
        break;
      }

      case "ltr_report": {
        const { mdn } = params;
        const response = await callTellabotAPI({ cmd: "ltr_report", mdn });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true };
        break;
      }

      case "ltr_switch_service": {
        const { ltr_id, service } = params;
        const response = await callTellabotAPI({ cmd: "ltr_switch_service", ltr_id, service });
        if (response.status === "error") {
          throw new Error(response.message as string);
        }
        result = { success: true, message: response.message };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ status: "ok", data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("SMS API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "error", message: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper to map TellaBot status to our internal status
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "Awaiting MDN": "awaiting_mdn",
    "Reserved": "reserved",
    "Completed": "completed",
    "Rejected": "rejected",
    "Timed Out": "timed_out",
    "online": "active",
    "offline": "offline",
    "awaiting mdn": "awaiting_mdn",
  };
  return statusMap[status] || status.toLowerCase().replace(/\s+/g, "_");
}
