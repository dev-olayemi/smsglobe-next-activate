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

    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    const response = await fetch(
      `${BASE_URL}?api_key=${API_KEY}&action=getBalanceAndCashBack`
    );

    const data = await response.text();
    
    // Parse response: ACCESS_BALANCE:balance:cashback
    const parts = data.split(":");
    const balance = parseFloat(parts[1] || "0");
    const cashback = parseFloat(parts[2] || "0");

    // Update user profile
    await supabase
      .from("profiles")
      .update({ balance, cashback })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({ balance, cashback }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
