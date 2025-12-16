import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, amountUSD, email, txRef, userId, depositId, currency } = await req.json();

    console.log("Initializing Flutterwave payment:", { amount, amountUSD, email, txRef, currency });

    const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY");
    if (!FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY not configured");
      throw new Error("Payment configuration error");
    }

    // Get the redirect URL from environment or use default
    const SITE_URL = Deno.env.get("SITE_URL") || "https://smsglobe.lovable.app";
    const redirectUrl = `${SITE_URL}/payment-callback?tx_ref=${txRef}`;

    const payload = {
      tx_ref: txRef,
      amount: amount,
      currency: currency || "NGN",
      redirect_url: redirectUrl,
      meta: {
        userId: userId,
        depositId: depositId,
        amountUSD: amountUSD,
      },
      customer: {
        email: email,
      },
      customizations: {
        title: "SMSGlobe Top Up",
        description: `Top up $${amountUSD} USD`,
        logo: "https://smsglobe.lovable.app/favicon.png",
      },
    };

    console.log("Calling Flutterwave API with payload:", JSON.stringify(payload));

    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Flutterwave response:", JSON.stringify(data));

    if (data.status === "success") {
      return new Response(
        JSON.stringify({ payment_link: data.data.link, tx_ref: txRef }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Flutterwave error:", data);
      throw new Error(data.message || "Failed to initialize payment");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in flutterwave-initialize:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
