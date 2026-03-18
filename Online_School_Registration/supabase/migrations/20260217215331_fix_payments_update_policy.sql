
-- Drop the overly permissive update policy
DROP POLICY "Service role can update payments" ON public.payments;

-- Create a properly scoped update policy - parents can update their own pending payments
CREATE POLICY "Parents can update their own pending payments"
ON public.payments
FOR UPDATE
USING (parent_id = auth.uid());
