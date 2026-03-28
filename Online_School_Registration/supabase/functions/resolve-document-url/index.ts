import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const parseStorageRef = (ref: string, fallbackBucket?: string) => {
  const trimmed = ref.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);

  if (match) {
    const rawPath = match[2];
    return {
      bucket: decodeURIComponent(match[1]),
      path: rawPath.includes('%') ? decodeURIComponent(rawPath) : rawPath,
    };
  }

  return {
    bucket: fallbackBucket ?? null,
    path: trimmed.includes('%') ? decodeURIComponent(trimmed) : trimmed,
  };
};

const matchesReference = (value: string | null, candidates: string[]) =>
  !!value && candidates.some((candidate) => candidate && value.includes(candidate));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const { ref, bucket: rawBucket, path: rawPath, expiresIn = 3600 } = await req.json();

    const parsed = ref ? parseStorageRef(ref, rawBucket) : { bucket: rawBucket ?? null, path: rawPath ?? '' };
    const bucket = parsed.bucket;
    const path = parsed.path;

    if (!bucket || !path) {
      return new Response(JSON.stringify({ error: 'Missing document reference' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (bucket !== 'student-documents') {
      return new Response(JSON.stringify({ error: 'Unsupported bucket' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let allowed = path.startsWith(`${userId}/`);

    if (!allowed) {
      const { data: schools, error: schoolsError } = await supabaseAdmin
        .from('schools')
        .select('id')
        .eq('admin_id', userId);

      if (schoolsError) throw schoolsError;

      const schoolIds = schools?.map((school) => school.id) ?? [];
      if (schoolIds.length > 0) {
        const candidates = Array.from(new Set([path, encodeURIComponent(path), ref || ''])).filter(Boolean);

        const [{ data: applications, error: applicationsError }, { data: payments, error: paymentsError }] = await Promise.all([
          supabaseAdmin
            .from('applications')
            .select('transcripts_url')
            .in('school_id', schoolIds)
            .not('transcripts_url', 'is', null)
            .limit(1000),
          supabaseAdmin
            .from('payments')
            .select('proof_payment_url')
            .in('school_id', schoolIds)
            .not('proof_payment_url', 'is', null)
            .limit(1000),
        ]);

        if (applicationsError) throw applicationsError;
        if (paymentsError) throw paymentsError;

        allowed =
          (applications ?? []).some((application) => matchesReference(application.transcripts_url, candidates)) ||
          (payments ?? []).some((payment) => matchesReference(payment.proof_payment_url, candidates));
      }
    }

    if (!allowed) {
      return new Response(JSON.stringify({ error: 'You do not have access to this document' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: signedError?.message || 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: signedData.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('resolve-document-url error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});