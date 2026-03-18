-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('parent', 'school_admin');

-- Create enum for student status
CREATE TYPE public.student_status AS ENUM ('pending', 'passed', 'repeat');

-- Create enum for application type
CREATE TYPE public.application_type AS ENUM ('new', 'transfer');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create schools table
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    province TEXT NOT NULL,
    district TEXT NOT NULL,
    sector TEXT NOT NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    staff_name TEXT,
    qualifications TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    dob DATE NOT NULL,
    parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    status student_status NOT NULL DEFAULT 'pending',
    current_grade TEXT,
    student_id_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create applications table
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    type application_type NOT NULL DEFAULT 'new',
    transcripts_url TEXT,
    momo_id TEXT,
    proof_payment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles during signup"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Schools policies (public read for discovery, admin write for their school)
CREATE POLICY "Anyone can view approved schools"
ON public.schools FOR SELECT
TO anon, authenticated
USING (is_approved = true);

CREATE POLICY "School admins can view their own school"
ON public.schools FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

CREATE POLICY "School admins can update their own school"
ON public.schools FOR UPDATE
TO authenticated
USING (admin_id = auth.uid());

CREATE POLICY "Authenticated users can create schools"
ON public.schools FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

-- Students policies (parents can manage their children)
CREATE POLICY "Parents can view their own children"
ON public.students FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert their own children"
ON public.students FOR INSERT
TO authenticated
WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update their own children"
ON public.students FOR UPDATE
TO authenticated
USING (parent_id = auth.uid());

CREATE POLICY "School admins can view students in their school"
ON public.students FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.schools 
        WHERE schools.id = students.school_id 
        AND schools.admin_id = auth.uid()
    )
);

-- Applications policies
CREATE POLICY "Parents can view their children's applications"
ON public.applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = applications.student_id
        AND students.parent_id = auth.uid()
    )
);

CREATE POLICY "Parents can create applications for their children"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = applications.student_id
        AND students.parent_id = auth.uid()
    )
);

CREATE POLICY "School admins can view applications to their school"
ON public.applications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.schools
        WHERE schools.id = applications.school_id
        AND schools.admin_id = auth.uid()
    )
);

CREATE POLICY "School admins can update applications to their school"
ON public.applications FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.schools
        WHERE schools.id = applications.school_id
        AND schools.admin_id = auth.uid()
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON public.applications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration (create profile automatically)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();