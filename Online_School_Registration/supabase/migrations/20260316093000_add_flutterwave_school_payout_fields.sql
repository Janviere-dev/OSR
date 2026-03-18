-- Add Flutterwave payout routing fields for schools and payment transfer tracking.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS flutterwave_payout_mobile_network text,
  ADD COLUMN IF NOT EXISTS flutterwave_payout_mobile_number text,
  ADD COLUMN IF NOT EXISTS flutterwave_transfer_recipient_id text;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS flutterwave_payout_transfer_id text,
  ADD COLUMN IF NOT EXISTS flutterwave_payout_status text;

-- Optional constraints to keep network values clean.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schools_flutterwave_payout_mobile_network_check'
  ) THEN
    ALTER TABLE public.schools
      ADD CONSTRAINT schools_flutterwave_payout_mobile_network_check
      CHECK (
        flutterwave_payout_mobile_network IS NULL
        OR flutterwave_payout_mobile_network IN ('MTN', 'AIRTEL')
      );
  END IF;
END $$;