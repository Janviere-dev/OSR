import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type FlutterwaveVerifyResponse = {
  status?: string;
  message?: string;
  data?: {
    status?: string;
    tx_ref?: string;
    amount?: number;
    currency?: string;
    payment_type?: string;
  };
};

type FlutterwaveTransferResponse = {
  status?: string;
  message?: string;
  data?: {
    id?: string;
    status?: string;
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FLUTTERWAVE_CLIENT_ID = Deno.env.get('FLUTTERWAVE_CLIENT_ID')?.trim();
    const FLUTTERWAVE_CLIENT_SECRET = Deno.env.get('FLUTTERWAVE_CLIENT_SECRET')?.trim();
    const FLUTTERWAVE_API_BASE_URL = (Deno.env.get('FLUTTERWAVE_API_BASE_URL') || 'https://developersandbox-api.flutterwave.com').trim();
    if (!FLUTTERWAVE_CLIENT_ID || !FLUTTERWAVE_CLIENT_SECRET) {
      throw new Error('FLUTTERWAVE_CLIENT_ID or FLUTTERWAVE_CLIENT_SECRET is not configured');
    }

    const authResponse = await fetch('https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: FLUTTERWAVE_CLIENT_ID,
        client_secret: FLUTTERWAVE_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    });

    const authData = await authResponse.json();
    if (!authResponse.ok || !authData?.access_token) {
      throw new Error(`Flutterwave OAuth error: ${authData?.error_description || authData?.error || 'Unable to get access token'}`);
    }

    const flutterwaveAccessToken = authData.access_token as string;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const { tx_ref, transaction_id } = await req.json();

    if (!tx_ref || !transaction_id) {
      return new Response(JSON.stringify({ error: 'Missing tx_ref or transaction_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: payment, error: paymentLookupError } = await supabaseAdmin
      .from('payments')
      .select('id, school_id, flutterwave_payout_transfer_id')
      .eq('flutterwave_tx_ref', tx_ref)
      .eq('parent_id', userId)
      .maybeSingle();

    if (paymentLookupError) {
      throw new Error(`Failed to validate payment ownership: ${paymentLookupError.message}`);
    }

    if (!payment) {
      return new Response(JSON.stringify({ error: 'Payment not found for this user' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify transaction with Flutterwave
    const verifyUrls = [
      `${FLUTTERWAVE_API_BASE_URL}/v3/transactions/${transaction_id}/verify`,
      `${FLUTTERWAVE_API_BASE_URL}/transactions/${transaction_id}/verify`,
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
    ];

    let verifyData: FlutterwaveVerifyResponse | null = null;
    let verifyResponse: Response | null = null;

    for (const url of verifyUrls) {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${flutterwaveAccessToken}`,
        },
      });

      let data: FlutterwaveVerifyResponse | null = null;
      try {
        data = await response.json() as FlutterwaveVerifyResponse;
      } catch {
        data = null;
      }

      if (response.status === 404) {
        continue;
      }

      verifyResponse = response;
      verifyData = data;
      break;
    }

    if (!verifyResponse || !verifyData) {
      throw new Error('Could not verify payment on known Flutterwave endpoints');
    }

    const verifiedTx = verifyData.data;

    if (
      verifyData.status === 'success' &&
      verifiedTx?.status === 'successful' &&
      verifiedTx?.tx_ref === tx_ref
    ) {
      // Update payment as successful
      const { error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          status: 'completed',
          flutterwave_tx_id: transaction_id.toString(),
          payment_method: verifiedTx.payment_type || 'unknown',
        })
        .eq('flutterwave_tx_ref', tx_ref);

      if (updateError) {
        throw new Error(`Failed to update payment: ${updateError.message}`);
      }

      // Route funds to the configured school payout destination if not already transferred.
      let payoutStatus = 'not_configured';
      if (!payment.flutterwave_payout_transfer_id) {
        const { data: school, error: schoolError } = await supabaseAdmin
          .from('schools')
          .select('id, name, flutterwave_payout_mobile_network, flutterwave_payout_mobile_number, flutterwave_transfer_recipient_id')
          .eq('id', payment.school_id)
          .maybeSingle();

        if (schoolError) {
          console.error('Failed to load school payout details:', schoolError);
          payoutStatus = 'school_lookup_failed';
        } else if (
          school?.flutterwave_payout_mobile_network &&
          school?.flutterwave_payout_mobile_number &&
          verifiedTx.amount
        ) {
          try {
            let recipientId = school.flutterwave_transfer_recipient_id as string | null;

            if (!recipientId) {
              const recipientResponse = await fetch(`${FLUTTERWAVE_API_BASE_URL}/transfers/recipients`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${flutterwaveAccessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'mobile_money_rwf',
                  name: {
                    first: school.name || 'School',
                    last: 'Account',
                  },
                  mobile_money: {
                    network: String(school.flutterwave_payout_mobile_network).toUpperCase(),
                    msisdn: String(school.flutterwave_payout_mobile_number).replace(/\D/g, ''),
                  },
                }),
              });

              const recipientData = await recipientResponse.json();
              if (!recipientResponse.ok || !recipientData?.data?.id) {
                throw new Error(
                  `Recipient error: ${recipientData?.message || recipientData?.error || 'Unknown recipient creation error'} (HTTP ${recipientResponse.status})`
                );
              }

              recipientId = recipientData.data.id as string;

              await supabaseAdmin
                .from('schools')
                .update({ flutterwave_transfer_recipient_id: recipientId })
                .eq('id', school.id);
            }

            const transferResponse = await fetch(`${FLUTTERWAVE_API_BASE_URL}/transfers`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${flutterwaveAccessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                action: 'instant',
                reference: `OSR-PAYOUT-${tx_ref}`,
                narration: `School fee payout for ${school.name}`,
                payment_instruction: {
                  recipient_id: recipientId,
                  source_currency: verifiedTx.currency || 'RWF',
                  amount: verifiedTx.amount,
                },
                meta: {
                  tx_ref,
                  school_id: school.id,
                },
              }),
            });

            const transferData = await transferResponse.json() as FlutterwaveTransferResponse;
            if (!transferResponse.ok || transferData.status !== 'success') {
              throw new Error(
                `Transfer error: ${transferData?.message || 'Unknown transfer error'} (HTTP ${transferResponse.status})`
              );
            }

            await supabaseAdmin
              .from('payments')
              .update({
                flutterwave_payout_transfer_id: transferData.data?.id || null,
                flutterwave_payout_status: transferData.data?.status || 'submitted',
              })
              .eq('id', payment.id);

            payoutStatus = transferData.data?.status || 'submitted';
          } catch (transferError) {
            const transferMessage = transferError instanceof Error ? transferError.message : 'Unknown transfer error';
            console.error('School payout transfer failed:', transferMessage);
            await supabaseAdmin
              .from('payments')
              .update({ flutterwave_payout_status: 'failed' })
              .eq('id', payment.id);
            payoutStatus = 'failed';
          }
        }
      } else {
        payoutStatus = 'already_transferred';
      }

      return new Response(JSON.stringify({
        status: 'success',
        message: 'Payment verified successfully',
        amount: verifiedTx.amount,
        currency: verifiedTx.currency,
        payout_status: payoutStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Mark payment as failed
      await supabaseAdmin
        .from('payments')
        .update({ status: 'failed' })
        .eq('flutterwave_tx_ref', tx_ref);

      return new Response(JSON.stringify({
        status: 'failed',
        message: 'Payment verification failed',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Payment verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
