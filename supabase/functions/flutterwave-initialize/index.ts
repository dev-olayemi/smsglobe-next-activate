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
    const { amount, amountUSD, email, txRef, userId, depositId, currency } = await req.json();

    if (!amount || amount < 100) {
      throw new Error('Invalid amount (minimum ₦100)');
    }

    if (!email || !txRef || !userId) {
      throw new Error('Missing required fields');
    }

    // Get the app URL for redirect
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://5ba5d988-4d24-4db6-8699-43700a0583e0.lovableproject.com';
    const redirectUrl = `${appUrl}/payment-callback`;

    // Initialize Flutterwave payment
    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('FLW_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: currency || 'NGN',
        redirect_url: redirectUrl,
        payment_options: 'card,banktransfer,ussd',
        meta: {
          user_id: userId,
          deposit_id: depositId,
          amount_usd: amountUSD,
        },
        customer: {
          email: email,
          name: email.split('@')[0],
        },
        customizations: {
          title: 'SMSGlobe Balance Top Up',
          description: `Top up account balance - $${amountUSD} USD`,
          logo: `${appUrl}/logo.png`,
        },
      }),
    });

    const flwData = await flwResponse.json();
    console.log('Flutterwave response:', flwData);

    if (flwData.status !== 'success') {
      throw new Error(flwData.message || 'Failed to initialize payment');
    }

    return new Response(
      JSON.stringify({
        payment_link: flwData.data.link,
        tx_ref: txRef,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Flutterwave initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
