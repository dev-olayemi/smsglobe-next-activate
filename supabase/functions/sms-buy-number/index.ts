import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { service, country, type, rental_days: days, operator } = await req.json();
    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    let url = `${BASE_URL}?api_key=${API_KEY}&action=getNumber&service=${service}&country=${country}`;
    if (operator) {
      url += `&operator=${operator}`;
    }

    const response = await fetch(url);
    const responseData = await response.text();

    console.log("Buy number response:", responseData);

    if (responseData.startsWith("ACCESS_NUMBER")) {
      const parts = responseData.split(":");
      const activationId = parts[1];
      const phoneNumber = parts[2];

      // Save activation to database
      const { data: activation, error } = await supabase
        .from("activations")
        .insert({
          user_id: user.id,
          activation_id: activationId,
          phone_number: phoneNumber,
          service,
          country_code: parseInt(country),
          country_name: getCountryName(parseInt(country)),
          operator: operator || null,
          activation_type: type || "standard",
          rental_days: days || null,
          is_voice: type === "voice",
          price: 0.5, // This should come from price info
          status: "waiting",
          expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify(activation),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      throw new Error(responseData);
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getCountryName(code: number): string {
  const countries: { [key: number]: string } = {
    0: "Russia",
    1: "Ukraine",
    2: "Kazakhstan",
    6: "Indonesia",
    7: "Malaysia",
    12: "USA",
  };
  return countries[code] || `Country ${code}`;
}
