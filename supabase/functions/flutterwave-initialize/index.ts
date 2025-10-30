import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { amount, email } = await req.json();

    if (!amount || amount < 1) {
      throw new Error('Invalid amount');
    }

    // Get user profile for email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    const userEmail = email || profile?.email || user.email;

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
        tx_ref: `txn_${Date.now()}_${user.id.slice(0, 8)}`,
        amount: amount,
        currency: 'USD',
        redirect_url: redirectUrl,
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: userEmail,
          name: userEmail.split('@')[0],
        },
        customizations: {
          title: 'SMSGlobe Balance Top Up',
          description: `Top up account balance - $${amount}`,
          logo: `${appUrl}/logo.png`,
        },
      }),
    });

    const flwData = await flwResponse.json();
    console.log('Flutterwave response:', flwData);

    if (flwData.status !== 'success') {
      throw new Error(flwData.message || 'Failed to initialize payment');
    }

    // Create deposit record
    await supabaseClient.from('deposits').insert({
      user_id: user.id,
      amount: amount,
      payment_method: 'flutterwave',
      status: 'pending',
      transaction_id: flwData.data.tx_ref,
    });

    return new Response(
      JSON.stringify({
        payment_link: flwData.data.link,
        tx_ref: flwData.data.tx_ref,
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
