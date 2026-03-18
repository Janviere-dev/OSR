-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public) VALUES ('student-documents', 'student-documents', false);

-- Create storage policies for student documents
CREATE POLICY "Parents can upload documents for their children"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Parents can view their own documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Parents can update their own documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Parents can delete their own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'student-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add phone to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Add mother_name and father_name to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name text;

-- Add previous_school_name and transfer_reason to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS previous_school_name text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS transfer_reason text;