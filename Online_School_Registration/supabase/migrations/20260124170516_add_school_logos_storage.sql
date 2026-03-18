-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-logos', 'school-logos', true);

-- Allow anyone to view school logos (public bucket)
CREATE POLICY "School logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

-- Allow authenticated users to upload logos during registration
CREATE POLICY "Users can upload school logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-logos' AND auth.role() = 'authenticated');

-- Allow school admins to update their logos
CREATE POLICY "School admins can update their logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-logos' AND auth.role() = 'authenticated');