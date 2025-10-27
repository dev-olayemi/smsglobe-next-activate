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
      `${BASE_URL}?api_key=${API_KEY}&action=getStatus&id=${activation_id}`
    );

    const data = await response.text();
    console.log("Status response:", data);

    let smsCode = null;
    let smsText = null;
    let status = "waiting";

    if (data.startsWith("STATUS_OK")) {
      const parts = data.split(":");
      smsCode = parts[1];
      status = "completed";
    } else if (data.startsWith("FULL_SMS")) {
      const parts = data.split(":");
      smsCode = parts[1];
      smsText = parts[2];
      status = "completed";
    } else if (data === "STATUS_WAIT_CODE") {
      status = "waiting";
    } else if (data === "STATUS_CANCEL") {
      status = "cancelled";
    }

    // Update database
    await supabase
      .from("activations")
      .update({
        status,
        sms_code: smsCode,
        sms_text: smsText,
      })
      .eq("activation_id", activation_id)
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        activation_id,
        status,
        sms_code: smsCode,
        sms_text: smsText,
      }),
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
