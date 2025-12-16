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
    const { transaction_id, tx_ref } = await req.json();

    console.log("Verifying Flutterwave payment:", { transaction_id, tx_ref });

    const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY");
    if (!FLW_SECRET_KEY) {
      console.error("FLW_SECRET_KEY not configured");
      throw new Error("Payment configuration error");
    }

    // Verify the transaction
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    console.log("Flutterwave verification response:", JSON.stringify(data));

    if (data.status === "success" && data.data.status === "successful") {
      const transactionData = data.data;
      
      // Verify tx_ref matches
      if (transactionData.tx_ref !== tx_ref) {
        throw new Error("Transaction reference mismatch");
      }

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: transactionData.id,
          tx_ref: transactionData.tx_ref,
          amount: transactionData.amount,
          currency: transactionData.currency,
          charged_amount: transactionData.charged_amount,
          meta: transactionData.meta,
          customer: transactionData.customer,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Payment verification failed:", data);
      return new Response(
        JSON.stringify({
          success: false,
          message: data.message || "Payment verification failed",
          status: data.data?.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in flutterwave-verify:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
