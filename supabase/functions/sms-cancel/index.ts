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

    const { activation_id } = await req.json();
    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    const response = await fetch(
      `${BASE_URL}?api_key=${API_KEY}&action=setStatus&status=8&id=${activation_id}`
    );

    const data = await response.text();
    console.log("Cancel response:", data);

    // Update database
    await supabase
      .from("activations")
      .update({ status: "cancelled" })
      .eq("activation_id", activation_id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, message: data }),
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
