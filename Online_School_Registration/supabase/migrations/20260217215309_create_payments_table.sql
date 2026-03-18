
-- Create payments table for tracking school fee payments
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id),
  parent_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RWF',
  flutterwave_tx_ref TEXT NOT NULL UNIQUE,
  flutterwave_tx_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Parents can view their own payments
CREATE POLICY "Parents can view their own payments"
ON public.payments
FOR SELECT
USING (parent_id = auth.uid());

-- Parents can insert their own payments
CREATE POLICY "Parents can create payments"
ON public.payments
FOR INSERT
WITH CHECK (parent_id = auth.uid());

-- School admins can view payments for their school
CREATE POLICY "School admins can view school payments"
ON public.payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM schools WHERE schools.id = payments.school_id AND schools.admin_id = auth.uid()
));

-- Allow edge function to update payment status (service role)
CREATE POLICY "Service role can update payments"
ON public.payments
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
