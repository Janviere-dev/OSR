-- Repair migration: ensure Flutterwave payout columns exist in environments
-- where an earlier migration was not applied.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS flutterwave_payout_mobile_network text,
  ADD COLUMN IF NOT EXISTS flutterwave_payout_mobile_number text,
  ADD COLUMN IF NOT EXISTS flutterwave_transfer_recipient_id text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS flutterwave_payout_transfer_id text,
  ADD COLUMN IF NOT EXISTS flutterwave_payout_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schools_flutterwave_payout_mobile_network_check'
      AND conrelid = 'public.schools'::regclass
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_flutterwave_payout_mobile_network_check
      CHECK (
        flutterwave_payout_mobile_network IS NULL
        OR flutterwave_payout_mobile_network IN ('MTN', 'AIRTEL')
      );
  END IF;
END $$;

-- Force PostgREST to refresh schema cache immediately.
NOTIFY pgrst, 'reload schema';
