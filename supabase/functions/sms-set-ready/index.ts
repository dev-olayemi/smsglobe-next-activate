import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { activation_id } = await req.json();
    const API_KEY = Deno.env.get("SMS_ACTIVATE_API_KEY");
    const BASE_URL = "https://api.sms-activate.ae/stubs/handler_api.php";

    const response = await fetch(
      `${BASE_URL}?api_key=${API_KEY}&action=setStatus&status=1&id=${activation_id}`
    );

    const data = await response.text();
    console.log("Set ready response:", data);

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
