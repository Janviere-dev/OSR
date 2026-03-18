-- Add class/stream field to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_stream text;

-- Allow school admins to update students in their school
CREATE POLICY "School admins can update students in their school"
ON public.students
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM schools
  WHERE schools.id = students.school_id
  AND schools.admin_id = auth.uid()
));