import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type FlutterwavePaymentResponse = {
  status?: string;
  message?: string;
  errors?: unknown;
  error?: {
    message?: string;
  } | string;
  data?: {
    link?: string;
    checkout_url?: string;
    hosted_url?: string;
    payment_link?: string;
    id?: string;
    next_action?: {
      redirect_url?: {
        url?: string;
      } | string;
    };
  };
};

const findCustomerIdByEmail = (payload: unknown, email: string): string | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;

  const normalizedEmail = email.trim().toLowerCase();
  const root = payload as Record<string, unknown>;
  const candidates: unknown[] = [];

  if (Array.isArray(root.data)) {
    candidates.push(...root.data);
  }

  if (root.data && typeof root.data === 'object') {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.items)) candidates.push(...nested.items);
    if (Array.isArray(nested.customers)) candidates.push(...nested.customers);
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const row = candidate as Record<string, unknown>;
    const rowEmail = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
    const rowId = typeof row.id === 'string' ? row.id : undefined;
    if (rowEmail === normalizedEmail && rowId) {
      return rowId;
    }
  }

  return undefined;
};

const extractPaymentLink = (payload: FlutterwavePaymentResponse | null): string | undefined => {
  return (
    payload?.data?.link ||
    payload?.data?.checkout_url ||
    payload?.data?.hosted_url ||
    payload?.data?.payment_link ||
    (typeof payload?.data?.next_action?.redirect_url === 'string'
      ? payload.data.next_action.redirect_url
      : payload?.data?.next_action?.redirect_url?.url)
  );
};

const isLocalHostname = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized.endsWith('.local')
  );
};

const getValidatedRedirectUrl = (
  providedRedirectUrl: unknown,
  configuredRedirectUrl: string | undefined,
): string => {
  const configured = configuredRedirectUrl?.trim();
  const provided = typeof providedRedirectUrl === 'string' ? providedRedirectUrl.trim() : '';

  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol !== 'https:') {
        throw new Error('FLUTTERWAVE_REDIRECT_URL must use https');
      }
      return url.toString();
    } catch {
      throw new Error('FLUTTERWAVE_REDIRECT_URL is not a valid absolute URL');
    }
  }

  if (!provided) {
    throw new Error('Missing required redirect URL');
  }

  let parsed: URL;
  try {
    parsed = new URL(provided);
  } catch {
    throw new Error('Invalid redirect URL format');
  }

  if (parsed.protocol === 'https:') {
    return parsed.toString();
  }

  if (parsed.protocol === 'http:' && isLocalHostname(parsed.hostname)) {
    throw new Error(
      'Redirect URL cannot be localhost for Flutterwave. Set FLUTTERWAVE_REDIRECT_URL to your public https callback URL.'
    );
  }

  throw new Error('Redirect URL must use https');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FLUTTERWAVE_CLIENT_ID = Deno.env.get('FLUTTERWAVE_CLIENT_ID')?.trim();
    const FLUTTERWAVE_CLIENT_SECRET = Deno.env.get('FLUTTERWAVE_CLIENT_SECRET')?.trim();
    const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY')?.trim();
    const FLUTTERWAVE_API_BASE_URL = (Deno.env.get('FLUTTERWAVE_API_BASE_URL') || 'https://developersandbox-api.flutterwave.com').trim();
    const FLUTTERWAVE_CLASSIC_API_BASE_URL = Deno.env.get('FLUTTERWAVE_CLASSIC_API_BASE_URL')?.trim();
    const inferredClassicBase = /developersandbox-api\.flutterwave\.com/i.test(FLUTTERWAVE_API_BASE_URL)
      ? `${FLUTTERWAVE_API_BASE_URL}/flutterwave`
      : FLUTTERWAVE_API_BASE_URL;
    const flutterwaveClassicBase = (FLUTTERWAVE_CLASSIC_API_BASE_URL || inferredClassicBase).replace(/\/$/, '');
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

    // Sanity-check the OAuth token against the selected Flutterwave API base.
    const oauthProbeResponse = await fetch(`${FLUTTERWAVE_API_BASE_URL}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${flutterwaveAccessToken}`,
      },
    });
    if (oauthProbeResponse.status === 401 || oauthProbeResponse.status === 403) {
      let oauthProbeBody: Record<string, unknown> | null = null;
      try {
        oauthProbeBody = await oauthProbeResponse.json() as Record<string, unknown>;
      } catch {
        oauthProbeBody = null;
      }
      const probeMessage =
        (typeof oauthProbeBody?.message === 'string' && oauthProbeBody.message) ||
        (typeof oauthProbeBody?.error === 'string' && oauthProbeBody.error) ||
        'OAuth token rejected by Flutterwave API';
      throw new Error(`Flutterwave OAuth token is not valid for ${FLUTTERWAVE_API_BASE_URL}: ${probeMessage}`);
    }

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

    const user = userData.user;
    const userId = user.id;

    const { studentId, amount, redirectUrl, mobileMoney } = await req.json();
    const FLUTTERWAVE_REDIRECT_URL = Deno.env.get('FLUTTERWAVE_REDIRECT_URL');
    const effectiveRedirectUrl = getValidatedRedirectUrl(redirectUrl, FLUTTERWAVE_REDIRECT_URL);

    if (!studentId || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mobileMoneyNetwork =
      typeof mobileMoney?.network === 'string' ? mobileMoney.network.trim().toUpperCase() : '';
    const mobileMoneyCountryCode =
      typeof mobileMoney?.countryCode === 'string' ? mobileMoney.countryCode.trim() : '';
    const mobileMoneyPhone =
      typeof mobileMoney?.phoneNumber === 'string'
        ? mobileMoney.phoneNumber.replace(/\D/g, '').replace(/^0+/, '')
        : '';

    if (!mobileMoneyNetwork || !mobileMoneyCountryCode || !mobileMoneyPhone) {
      return new Response(JSON.stringify({ error: 'Mobile money network, country code and phone number are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only parent users can initialize a school fee payment.
    const { data: parentRole, error: parentRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'parent')
      .maybeSingle();

    if (parentRoleError) {
      throw new Error(`Failed to verify user role: ${parentRoleError.message}`);
    }

    if (!parentRole) {
      return new Response(JSON.stringify({ error: 'Only parent users can make school fee payments' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate that the student belongs to the authenticated parent.
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, school_id, schools(name)')
      .eq('id', studentId)
      .eq('parent_id', userId)
      .not('school_id', 'is', null)
      .maybeSingle();

    if (studentError) {
      throw new Error(`Failed to validate student: ${studentError.message}`);
    }

    if (!student || !student.school_id) {
      return new Response(JSON.stringify({ error: 'Student not found for this parent, or no school assigned yet' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const schoolName = (student.schools as { name?: string } | null)?.name || 'Unknown School';
    const studentName = student.name;
    const parentEmail = user.email;

    if (!parentEmail) {
      return new Response(JSON.stringify({ error: 'Parent account is missing an email address' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique tx_ref
    const txRef = `OSR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const { error: insertError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: studentId,
        parent_id: userId,
        school_id: student.school_id,
        amount: numericAmount,
        currency: 'RWF',
        flutterwave_tx_ref: txRef,
        status: 'pending',
        description: `School fees for ${studentName} at ${schoolName}`,
      });

    if (insertError) {
      throw new Error(`Failed to create payment record: ${insertError.message}`);
    }

    // Initialize Flutterwave payment
    const paymentPayload = {
      tx_ref: txRef,
      amount: numericAmount,
      currency: 'RWF',
      redirect_url: effectiveRedirectUrl,
      payment_options: 'mobilemoneyrwanda,card',
      customer: {
        email: parentEmail,
        name: studentName,
      },
      customizations: {
        title: 'OSR School Fees',
        description: `School fees for ${studentName} at ${schoolName}`,
      },
      meta: {
        student_id: studentId,
        school_id: student.school_id,
        parent_id: userId,
      },
    };

    const paymentLinksPayload = {
      title: 'OSR School Fees',
      description: `School fees for ${studentName} at ${schoolName}`,
      amount: numericAmount,
      currency: 'RWF',
      redirect_url: effectiveRedirectUrl,
      customer: {
        email: parentEmail,
        name: studentName,
      },
      meta: {
        student_id: studentId,
        school_id: student.school_id,
        parent_id: userId,
      },
    };

    // v4 flow: create a customer then create a charge and redirect to next_action URL.
    const nameParts = studentName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Parent';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const customerResponse = await fetch(`${FLUTTERWAVE_API_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: parentEmail,
        name: {
          first: firstName,
          last: lastName,
        },
        meta: {
          student_id: studentId,
          school_id: student.school_id,
          parent_id: userId,
        },
      }),
    });

    const customerData = await customerResponse.json();
    let customerId = customerData?.data?.id as string | undefined;

    if (!customerResponse.ok) {
      const customerErrorMessage =
        customerData?.message ||
        customerData?.error?.message ||
        customerData?.error ||
        'Customer creation failed';

      const isAlreadyExists =
        customerResponse.status === 409 && /already exists/i.test(String(customerErrorMessage));

      if (isAlreadyExists) {
        const lookupResponse = await fetch(
          `${FLUTTERWAVE_API_BASE_URL}/customers?email=${encodeURIComponent(parentEmail)}&limit=100`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${flutterwaveAccessToken}`,
            },
          }
        );

        let lookupData: unknown = null;
        try {
          lookupData = await lookupResponse.json();
        } catch {
          lookupData = null;
        }

        const existingCustomerId = findCustomerIdByEmail(lookupData, parentEmail);
        if (existingCustomerId) {
          customerId = existingCustomerId;
        } else {
          throw new Error(
            `Flutterwave customer error: customer exists but lookup failed (HTTP ${lookupResponse.status})`
          );
        }
      } else {
        throw new Error(`Flutterwave customer error: ${customerErrorMessage} (HTTP ${customerResponse.status})`);
      }
    }

    if (!customerId) {
      throw new Error('Flutterwave customer error: missing customer_id in response');
    }

    const paymentAttempts: Array<{
      url: string;
      payload: Record<string, unknown>;
      authValue: string;
    }> = [
      {
        url: `${FLUTTERWAVE_API_BASE_URL}/v4/payment-links`,
        payload: paymentLinksPayload,
        authValue: flutterwaveAccessToken,
      },
      {
        url: `${FLUTTERWAVE_API_BASE_URL}/v4/payments`,
        payload: paymentPayload,
        authValue: flutterwaveAccessToken,
      },
      {
        url: `${FLUTTERWAVE_API_BASE_URL}/payment-links`,
        payload: paymentLinksPayload,
        authValue: flutterwaveAccessToken,
      },
      {
        url: `${FLUTTERWAVE_API_BASE_URL}/payments`,
        payload: paymentPayload,
        authValue: flutterwaveAccessToken,
      },
      {
        url: `${flutterwaveClassicBase}/v3/payments`,
        payload: paymentPayload,
        authValue: flutterwaveAccessToken,
      },
    ];

    if (FLUTTERWAVE_SECRET_KEY) {
      paymentAttempts.push({
        url: `${flutterwaveClassicBase}/v3/payments`,
        payload: paymentPayload,
        authValue: FLUTTERWAVE_SECRET_KEY,
      });
      paymentAttempts.push({
        url: 'https://api.flutterwave.com/v3/payments',
        payload: paymentPayload,
        authValue: FLUTTERWAVE_SECRET_KEY,
      });
    }

    let flutterwaveData: FlutterwavePaymentResponse | null = null;
    let flutterwaveResponse: Response | null = null;
    let lastError = 'Unknown error';
    let lastUrl = paymentAttempts[0].url;
    const attemptDiagnostics: string[] = [];

    for (const attempt of paymentAttempts) {
      lastUrl = attempt.url;
      const response = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${attempt.authValue}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attempt.payload),
      });

      let data: FlutterwavePaymentResponse | null = null;
      let rawText: string | null = null;
      try {
        data = await response.json() as FlutterwavePaymentResponse;
      } catch {
        try {
          rawText = await response.text();
        } catch {
          rawText = null;
        }
      }

      const paymentLinkCandidate = extractPaymentLink(data);
      const normalizedStatus = typeof data?.status === 'string' ? data.status.toLowerCase() : '';
      const isSuccessLikeStatus =
        normalizedStatus === 'success' ||
        normalizedStatus === 'created' ||
        normalizedStatus === 'pending';

      if (response.ok && (isSuccessLikeStatus || !normalizedStatus) && paymentLinkCandidate) {
        flutterwaveResponse = response;
        flutterwaveData = data;
        break;
      }

      const errorMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
      const validationDetails = data?.errors ? ` details=${JSON.stringify(data.errors)}` : '';
      lastError = `${data?.message || errorMessage || rawText || 'Unknown error'}${validationDetails}`;
      attemptDiagnostics.push(`${attempt.url} -> HTTP ${response.status} :: ${lastError}`);

      // If endpoint responded 2xx but without a usable redirect URL, try the next known endpoint.
      if (response.ok) {
        continue;
      }

      // Retry known endpoint/auth variants on common endpoint or auth mismatch responses.
      if (
        response.status === 404 ||
        (response.status === 401 && /invalid authorization key|unauthorized/i.test(lastError))
      ) {
        continue;
      }

      flutterwaveResponse = response;
      flutterwaveData = data;
      break;
    }

    const paymentLink = extractPaymentLink(flutterwaveData);

    if (!flutterwaveResponse?.ok || !paymentLink) {
      // Clean up the payment record
      await supabaseAdmin.from('payments').delete().eq('flutterwave_tx_ref', txRef);
      throw new Error(
        `Flutterwave error: ${lastError} (HTTP ${flutterwaveResponse?.status ?? 'n/a'}, base ${FLUTTERWAVE_API_BASE_URL}, url ${lastUrl}, attempts ${attemptDiagnostics.join(' | ')})`
      );
    }

    return new Response(JSON.stringify({
      payment_link: paymentLink,
      tx_ref: txRef,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment initialization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
