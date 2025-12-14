import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transaction_id, tx_ref } = await req.json();

    if (!transaction_id) {
      throw new Error('Transaction ID required');
    }

    // Verify payment with Flutterwave
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('FLW_SECRET_KEY')}`,
        },
      }
    );

    const flwData = await flwResponse.json();
    console.log('Flutterwave verification response:', flwData);

    if (flwData.status !== 'success') {
      throw new Error('Payment verification failed with Flutterwave');
    }

    const paymentData = flwData.data;

    // Check if payment was successful
    if (paymentData.status !== 'successful') {
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          message: `Payment was not successful. Status: ${paymentData.status}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata
    const meta = paymentData.meta || {};
    const userId = meta.user_id;
    const depositId = meta.deposit_id;
    const amountUSD = meta.amount_usd || 0;

    // Return verification data for frontend to process with Firebase
    return new Response(
      JSON.stringify({
        status: 'success',
        verified: true,
        data: {
          transactionId: transaction_id,
          txRef: paymentData.tx_ref,
          amountNGN: paymentData.amount,
          amountUSD: amountUSD,
          currency: paymentData.currency,
          userId: userId,
          depositId: depositId,
          customerEmail: paymentData.customer?.email,
          paymentType: paymentData.payment_type,
          createdAt: paymentData.created_at,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage, status: 'error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
