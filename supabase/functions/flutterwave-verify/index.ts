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

    const { transaction_id } = await req.json();

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
      throw new Error('Payment verification failed');
    }

    const paymentData = flwData.data;

    // Check if payment was successful
    if (paymentData.status !== 'successful') {
      return new Response(
        JSON.stringify({ 
          status: 'failed',
          message: 'Payment was not successful' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deposit record - try both tx_ref formats
    let { data: deposit, error: depositError } = await supabaseClient
      .from('deposits')
      .select('*')
      .eq('transaction_id', paymentData.tx_ref)
      .eq('user_id', user.id)
      .maybeSingle();

    // If not found by tx_ref, try to create it if payment is valid
    if (!deposit && paymentData.status === 'successful') {
      console.log('Deposit not found, creating new record for successful payment');
      const { data: newDeposit, error: insertError } = await supabaseClient
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: paymentData.amount,
          payment_method: 'flutterwave',
          status: 'pending',
          transaction_id: paymentData.tx_ref,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating deposit:', insertError);
        throw new Error('Failed to create deposit record');
      }
      deposit = newDeposit;
    }

    if (!deposit) {
      throw new Error('Deposit record not found and could not be created');
    }

    if (deposit.status === 'completed') {
      return new Response(
        JSON.stringify({ 
          status: 'already_processed',
          message: 'This payment has already been processed' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deposit status
    await supabaseClient
      .from('deposits')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', deposit.id);

    // Update user balance
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single();

    const newBalance = (profile?.balance || 0) + paymentData.amount;

    await supabaseClient
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id);

    // Create transaction record
    await supabaseClient
      .from('balance_transactions')
      .insert({
        user_id: user.id,
        type: 'deposit',
        amount: paymentData.amount,
        balance_after: newBalance,
        description: `Deposit via Flutterwave - ${paymentData.tx_ref}`,
      });

    return new Response(
      JSON.stringify({
        status: 'success',
        amount: paymentData.amount,
        new_balance: newBalance,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
