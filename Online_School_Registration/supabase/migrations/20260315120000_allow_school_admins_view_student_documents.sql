-- Allow school admins to read student transcript files for application review.
-- This is required so school-side dialogs can generate signed URLs for transcript previews.

DROP POLICY IF EXISTS "School admins can view student documents" ON storage.objects;

CREATE POLICY "School admins can view student documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'school_admin'
  )
);
