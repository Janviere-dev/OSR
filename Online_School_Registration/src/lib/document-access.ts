import { supabase } from '@/integrations/supabase/client';

const DOC_MARKER_REGEX = /\[\[docs:([^|\]]*)\|([^|\]]*)\|([^\]]*)\]\]/g;
const PAYMENT_MARKER_REGEX = /\[\[payment:([^\]]+)\]\]/;

export const splitStoredReferences = (value?: string | null) =>
  value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];

const getStorageRefDetails = (ref: string, fallbackBucket?: string) => {
  const trimmed = ref.trim();
  const storageMatch = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+?)(?:\?|$)/);

  if (storageMatch) {
    const rawPath = storageMatch[2];
    const path = rawPath.includes('%') ? decodeURIComponent(rawPath) : rawPath;

    return {
      bucket: decodeURIComponent(storageMatch[1]),
      path,
    };
  }

  const path = trimmed.includes('%') ? decodeURIComponent(trimmed) : trimmed;

  return {
    bucket: fallbackBucket ?? null,
    path,
  };
};

export async function getAccessibleDocumentUrl(ref: string, fallbackBucket?: string, expiresIn = 3600) {
  if (/^https?:\/\//i.test(ref) && !ref.includes('/storage/v1/object/')) {
    return ref;
  }

  const { bucket, path } = getStorageRefDetails(ref, fallbackBucket);
  if (!bucket) return ref;

  // Both buckets are public — use direct signed URL (no edge function needed).
  // createSignedUrl works for authenticated users and gives a time-limited URL
  // even on public buckets, which is cleaner than a raw public URL.
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    // Fallback to public URL if signed URL fails (e.g. bucket is fully public)
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  return data.signedUrl;
}

export async function openDocumentReference(ref: string, fallbackBucket?: string) {
  const url = await getAccessibleDocumentUrl(ref, fallbackBucket);
  window.open(url, '_blank', 'noopener,noreferrer');
  return url;
}

export const createDocumentMarker = (bucket: string, label: string, refs: string[]) => {
  if (!refs.length) return '';
  return `[[docs:${bucket}|${encodeURIComponent(label)}|${refs.map((ref) => encodeURIComponent(ref)).join(';')}]]`;
};

export const createPaymentMarker = (paymentId: string) => `[[payment:${paymentId}]]`;

export const parseDocumentMarkers = (content: string) =>
  Array.from(content.matchAll(DOC_MARKER_REGEX)).map((match) => ({
    raw: match[0],
    bucket: match[1] || undefined,
    label: decodeURIComponent(match[2] || 'View Document'),
    refs: (match[3] || '').split(';').map((ref) => decodeURIComponent(ref)).filter(Boolean),
  }));

export const extractPaymentMarker = (content: string) => content.match(PAYMENT_MARKER_REGEX)?.[1] ?? null;

export const stripMessageMarkers = (content: string) =>
  content
    .replace(DOC_MARKER_REGEX, '')
    .replace(PAYMENT_MARKER_REGEX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
