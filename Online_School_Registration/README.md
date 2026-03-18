# Online School Registration

Production deployment runbook for Netlify + Vite + React Router + Supabase.

## 1) One-time repository setup (already done)

- SPA redirect config exists in [netlify.toml](netlify.toml)
- Backup SPA redirect exists in [public/_redirects](public/_redirects)
- Build script is `vite build` in [package.json](package.json)

These prevent the common Netlify 404 issue on client-side routes like `/auth`, `/parent`, and `/school`.

## 2) Local pre-deploy checks

Run these before pushing:

```bash
npm install
npm run build
```

Optional quality checks:

```bash
npm run lint
npm run typecheck
```

If `npm run build` fails locally, Netlify will fail too.

## 3) Netlify build settings

In Netlify site settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: use current LTS (recommended)

The build and publish config is also defined in [netlify.toml](netlify.toml).

## 4) Required environment variables (Netlify)

Set these in Netlify (Site settings → Environment variables):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_PUBLIC_APP_URL` (must be your public HTTPS domain, for example `https://your-site.netlify.app`)

Where they are used:

- Supabase client: [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts)
- Payment callback URL creation: [src/components/parent/PaymentForm.tsx](src/components/parent/PaymentForm.tsx)

After changing environment variables, trigger a new deploy.

## 5) Supabase production checks

Before go-live, confirm:

- Database migrations are applied in production
- Edge Functions used by the app are deployed (`initialize-payment`, `verify-payment`)
- RLS policies allow expected reads/writes for your roles
- Payment provider callback URL matches `VITE_PUBLIC_APP_URL/payment/callback`

## 6) Deploy process (safe sequence)

1. Commit and push your branch.
2. In Netlify, run **Clear cache and deploy site**.
3. Wait for successful build.
4. Open deployed app and test:
   - `/`
   - `/auth`
   - `/parent`
   - `/school`
   - payment flow up to callback page
5. Confirm browser console has no env-related errors.

## 7) Fast troubleshooting checklist

If you see Netlify “Page not found”:

1. Confirm [netlify.toml](netlify.toml) exists and includes redirect to `/index.html`.
2. Confirm [public/_redirects](public/_redirects) exists.
3. Confirm Netlify publish directory is `dist`.
4. Redeploy with cache cleared.

If app loads but backend actions fail:

1. Re-check Netlify environment variables.
2. Confirm Supabase project URL/key are from the correct environment.
3. Confirm Edge Functions are deployed and healthy.
4. Check function logs and browser network errors.

## 8) Recommended release practice

- Use a staging Netlify site and staging Supabase project.
- Validate full registration + payment flow on staging first.
- Promote only verified commits to production.
