
-- Add requirements PDF URL column to schools table
ALTER TABLE public.schools ADD COLUMN requirements_pdf_url text;

-- Create storage bucket for school requirement documents
INSERT INTO storage.buckets (id, name, public) VALUES ('school-documents', 'school-documents', true);

-- Public read access for school documents
CREATE POLICY "Anyone can view school documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-documents');

-- School admins can upload their school's documents
CREATE POLICY "School admins can upload school documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-documents' AND auth.uid() IS NOT NULL);

-- School admins can update their school's documents
CREATE POLICY "School admins can update school documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-documents' AND auth.uid() IS NOT NULL);

-- School admins can delete their school's documents
CREATE POLICY "School admins can delete school documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-documents' AND auth.uid() IS NOT NULL);
