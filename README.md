# Online School Registration (OSR) Rwanda

A full-stack web application for managing school registrations, student transfers, payments, and government reporting across Rwanda. Built with React, Vite, Supabase, and Tailwind CSS.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Project](#2-clone-the-project)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [Database Setup: SQL Editor](#4-database-setup--sql-editor)
   - [Query 1: Core Tables, Enums, RLS & Triggers](#query-1--core-tables-enums-rls--triggers)
   - [Query 2: Storage Buckets & Extra Columns](#query-2--storage-buckets--extra-columns)
   - [Query 3: Class Stream & School Admin Student Policy](#query-3--class-stream--school-admin-student-policy)
   - [Query 4: School Logos Bucket](#query-4--school-logos-bucket)
   - [Query 5: School Documents Bucket & Requirements PDF](#query-5--school-documents-bucket--requirements-pdf)
   - [Query 6: Payments Table](#query-6--payments-table)
   - [Query 7: Fix Payments Update Policy](#query-7--fix-payments-update-policy)
   - [Query 8: Payments: Proof URL & Remove Flutterwave Constraints](#query-8--payments-proof-url--remove-flutterwave-constraints)
   - [Query 9: Parent Contact Fields on Students](#query-9--parent-contact-fields-on-students)
   - [Query 10: Messages Table & Realtime](#query-10--messages-table--realtime)
   - [Query 11: Parent Phone Fields on Students](#query-11--parent-phone-fields-on-students)
   - [Query 12: Enrolled Status, School Description & Payment Admin Policy](#query-12--enrolled-status-school-description--payment-admin-policy)
   - [Query 13: Remove Flutterwave Columns](#query-13--remove-flutterwave-columns)
5. [Deploy the Edge Function](#5-deploy-the-edge-function)
6. [Environment Variables](#6-environment-variables)
7. [Install and Run Locally](#7-install--run-locally)
8. [First Login and Roles](#8-first-login--roles)
9. [Deploy to Netlify](#9-deploy-to-netlify)
10. [Project Structure](#10-project-structure)
11. [Features Overview](#11-features-overview)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Prerequisites

Install the following before starting:

| Tool | Minimum version | How to get it |
|------|----------------|---------------|
| Node.js | v18 | https://nodejs.org |
| npm | v9 | comes with Node.js |
| Git | any | https://git-scm.com |
| Supabase CLI | v1 or v2 | see below |

### Install Supabase CLI (Linux)

```bash
curl -sL "https://github.com/supabase/cli/releases/download/v2.84.2/supabase_linux_amd64.tar.gz" \
  -o /tmp/supabase.tar.gz
tar -xzf /tmp/supabase.tar.gz -C /tmp
sudo mv /tmp/supabase /usr/local/bin/supabase
supabase --version
```

For Mac:
```bash
brew install supabase/tap/supabase
```

For Windows: download the `.exe` from https://github.com/supabase/cli/releases

---

## 2. Clone the Project

```bash
git clone <your-repo-url>
cd Online_School_Registration
npm install
```

---

## 3. Supabase Project Setup

### Step 1: Create an account and project

1. Go to **https://app.supabase.com** and create a free account if you don't have one.
2. Click **New Project**.
3. Fill in: project name, database password, and region closest to Rwanda (e.g. `eu-west-1`).
4. Click **Create new project** and wait ~2 minutes for provisioning to complete.

### Step 2: Get your API keys

1. In your project dashboard, go to **Settings → API**.
2. Copy two values:
   - **Project URL** — e.g. `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon / public** key — the long `eyJ…` JWT string

> **Important:** Use the `eyJ…` key labeled "anon / public". Do **not** use the `sb_publishable_…` key — that format does not work with Supabase JS v2.

---

## 4. Database Setup and SQL Editor

All database tables, policies, enums, triggers, and storage buckets are created by running SQL queries directly in the Supabase dashboard.

**How to run each query:**

1. In your Supabase project, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Paste the SQL for that query.
4. Click **Run** (or press `Ctrl+Enter`).
5. Confirm you see `Success. No rows returned` before moving to the next query.

Run the queries **in order** — each one builds on the previous.

---

### Query 1:  Core Tables, Enums, RLS and Triggers

This is the foundation. It creates all enums, the core tables (`profiles`, `user_roles`, `schools`, `students`, `applications`), enables Row Level Security, adds all access policies, timestamp triggers, and the auto-profile trigger on signup.

```sql
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
```

---

### Query 2: Storage Buckets and Extra Columns

Creates the `student-documents` storage bucket and adds extra columns to existing tables.

```sql
-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', false);

-- Storage policies for student documents
CREATE POLICY "Parents can upload documents for their children"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Parents can view their own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Parents can update their own documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Parents can delete their own documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'student-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add phone to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

-- Add parent name fields to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name text;

-- Add transfer fields to applications table
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS previous_school_name text;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS transfer_reason text;
```

---

### Query 3: Class Stream and School Admin Student Policy

Adds the `class_stream` column to students and a policy allowing school admins to update students enrolled in their school.

```sql
-- Add class/stream field to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS class_stream text;

-- Allow school admins to update students in their school
CREATE POLICY "School admins can update students in their school"
ON public.students FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM schools
        WHERE schools.id = students.school_id
        AND schools.admin_id = auth.uid()
    )
);
```

---

### Query 4: School Logos Bucket

Creates the public `school-logos` storage bucket for school logo and showcase images.

```sql
-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true);

-- Allow anyone to view school logos (public bucket)
CREATE POLICY "School logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-logos');

-- Allow authenticated users to upload logos during registration
CREATE POLICY "Users can upload school logos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'school-logos'
    AND auth.role() = 'authenticated'
);

-- Allow school admins to update their logos
CREATE POLICY "School admins can update their logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'school-logos'
    AND auth.role() = 'authenticated'
);
```

---

### Query 5: School Documents Bucket and Requirements PDF

Creates the public `school-documents` bucket for admission requirement PDFs and adds the `requirements_pdf_url` column to schools.

```sql
-- Add requirements PDF URL column to schools table
ALTER TABLE public.schools ADD COLUMN requirements_pdf_url text;

-- Create storage bucket for school requirement documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-documents', 'school-documents', true);

-- Public read access for school documents
CREATE POLICY "Anyone can view school documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-documents');

-- School admins can upload their school's documents
CREATE POLICY "School admins can upload school documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'school-documents'
    AND auth.uid() IS NOT NULL
);

-- School admins can update their school's documents
CREATE POLICY "School admins can update school documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'school-documents'
    AND auth.uid() IS NOT NULL
);

-- School admins can delete their school's documents
CREATE POLICY "School admins can delete school documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'school-documents'
    AND auth.uid() IS NOT NULL
);
```

---

### Query 6: Payments Table

Creates the `payments` table with RLS policies and a timestamp trigger.

```sql
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
ON public.payments FOR SELECT
USING (parent_id = auth.uid());

-- Parents can insert their own payments
CREATE POLICY "Parents can create payments"
ON public.payments FOR INSERT
WITH CHECK (parent_id = auth.uid());

-- School admins can view payments for their school
CREATE POLICY "School admins can view school payments"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM schools
        WHERE schools.id = payments.school_id
        AND schools.admin_id = auth.uid()
    )
);

-- Allow edge function to update payment status (service role)
CREATE POLICY "Service role can update payments"
ON public.payments FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

### Query 7: Fix Payments Update Policy

Replaces the overly permissive service-role update policy with a scoped one that only allows parents to update their own pending payments.

```sql
-- Drop the overly permissive update policy
DROP POLICY "Service role can update payments" ON public.payments;

-- Create a properly scoped update policy
CREATE POLICY "Parents can update their own pending payments"
ON public.payments FOR UPDATE
USING (parent_id = auth.uid());
```

---

### Query 8: Payments: Proof URL and Remove Flutterwave Constraints

Adds the `proof_payment_url` column for manual payment proof uploads and makes the Flutterwave fields nullable (payment gateway was replaced with manual proof upload).

```sql
-- Add proof_payment_url to payments table
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_payment_url text;

-- Make flutterwave_tx_ref nullable (no longer required)
ALTER TABLE public.payments ALTER COLUMN flutterwave_tx_ref DROP NOT NULL;
ALTER TABLE public.payments ALTER COLUMN flutterwave_tx_ref SET DEFAULT NULL;

-- Add description default
ALTER TABLE public.payments ALTER COLUMN description SET DEFAULT NULL;
```

---

### Query 9: Parent Contact Fields on Students

Adds parent phone and email directly on the student record for easier access by school admins.

```sql
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_email text;
```

---

### Query 10: Messages Table and Realtime

Creates the `messages` table for the two-way chat inbox between parents and school admins, with RLS policies and Supabase Realtime enabled.

```sql
-- Create messages table for chat between parents and school admins
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
    content text NOT NULL,
    is_system boolean NOT NULL DEFAULT false,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users can view their own messages"
ON public.messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- Users can insert messages where they are the sender
CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid());

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can mark received messages as read"
ON public.messages FOR UPDATE TO authenticated
USING (receiver_id = auth.uid());

-- Enable realtime on messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

### Query 11: Parent Phone Fields on Students

Adds mother and father phone number columns to the students table.

```sql
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_phone text;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_phone text;
```

---

### Query 12: Enrolled Status, School Description and Payment Admin Policy

Adds the `enrolled` value to the student status enum, adds `description` and `showcase_image_url` columns to schools, and adds a policy so school admins can update payments for their school (needed for the Mark as Paid flow).

```sql
-- Add 'enrolled' to the student_status enum
ALTER TYPE public.student_status ADD VALUE IF NOT EXISTS 'enrolled';

-- Add description and showcase image to schools
ALTER TABLE public.schools
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS showcase_image_url text;

-- Allow school admins to update payments for their school
CREATE POLICY "School admins can update school payments"
ON public.payments FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.schools
        WHERE schools.id = payments.school_id
          AND schools.admin_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.schools
        WHERE schools.id = payments.school_id
          AND schools.admin_id = auth.uid()
    )
);
```

---

### Query 13: Remove Flutterwave Columns

Removes the unused Flutterwave payment gateway columns (payment was switched to manual proof-of-payment upload).

```sql
ALTER TABLE public.payments DROP COLUMN IF EXISTS flutterwave_tx_ref;
ALTER TABLE public.payments DROP COLUMN IF EXISTS flutterwave_tx_id;
```

---

## 5. Deploy the Edge Function

The `resolve-document-url` edge function generates time-limited signed URLs so users can securely open uploaded documents.

### Step 1: Log in to Supabase CLI

```bash
supabase login
# A browser window opens — authenticate and return to the terminal
```

### Step 2: Link your project

Run this from inside the `Online_School_Registration/` folder:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the string between `https://` and `.supabase.co` in your project URL.

### Step 3: Deploy the function

```bash
supabase functions deploy resolve-document-url
```

Expected output:
```
Deployed Function resolve-document-url on project YOUR_PROJECT_REF
```

The environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase — no manual configuration needed.

---

## 6. Environment Variables

Create a `.env` file inside the `Online_School_Registration/` folder:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace both values with the ones copied from **Supabase → Settings → API**.

The `.env` file is listed in `.gitignore` and will never be committed to Git.

---

## 7. Install and Run Locally

```bash
# From inside the Online_School_Registration/ folder:
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### Other commands

```bash
npm run build       # Build for production → dist/
npm run preview     # Preview the production build at localhost:4173
npm run typecheck   # Check TypeScript types
npm run lint        # Run ESLint
```

---

## 8. First Login and Roles

1. Open http://localhost:5173
2. Click **Sign Up**
3. Select your role:
   - **Parent**:  register and manage your children's school applications, upload payment proof, chat with school admins
   - **School Administrator**: manage your school profile, review and approve applications, manage students, export SDMS reports
4. School admins are prompted to complete their school profile on first login

---

## 9. Deploy to Netlify

The project already includes `netlify.toml` and `public/_redirects` for SPA routing.

1. Push your code to GitHub.
2. Go to **https://app.netlify.com** → **Add new site → Import from Git**.
3. Select your repository.
4. Netlify auto-detects build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Go to **Site settings → Environment variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site**.

After the first deploy, redeploy the edge function pointing to production:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy resolve-document-url
```

---

## 10. Project Structure

```
Online_School_Registration/
├── public/
│   └── _redirects                  # Netlify SPA redirect rule
├── src/
│   ├── assets/                     # Images (gov-logo.png, etc.)
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatInbox.tsx       # Real-time messaging UI
│   │   ├── parent/
│   │   │   ├── RegisterStudentForm.tsx
│   │   │   ├── TransferStudentForm.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   └── StudentHub.tsx
│   │   ├── school/
│   │   │   ├── NewApplicationsTab.tsx
│   │   │   ├── TransfersTab.tsx
│   │   │   ├── ReRegistrationsTab.tsx
│   │   │   ├── StudentManagementTab.tsx
│   │   │   └── SchoolSidebar.tsx
│   │   ├── SchoolCard.tsx          # School discovery card + details dialog
│   │   ├── SchoolDiscovery.tsx     # School search and filter
│   │   └── ui/                     # Shadcn/Radix UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx         # Auth state and role management
│   │   └── LanguageContext.tsx     # English / Kinyarwanda translations
│   ├── hooks/
│   │   └── useSendSystemMessage.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts           # Supabase client setup
│   │       └── types.ts            # Auto-generated DB types
│   ├── lib/
│   │   └── document-access.ts      # Signed URL helpers & message markers
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Auth.tsx
│   │   ├── ParentDashboard.tsx
│   │   ├── SchoolDashboard.tsx
│   │   ├── SchoolApplications.tsx
│   │   ├── SchoolStudents.tsx
│   │   ├── SchoolGovernment.tsx    # SDMS Excel export
│   │   ├── SchoolSettings.tsx
│   │   └── SchoolInbox.tsx
│   └── data/
│       └── rwanda-locations.ts     # Provinces, districts, sectors
├── supabase/
│   └── functions/
│       └── resolve-document-url/
│           └── index.ts            # Edge function (Deno) — signed document URLs
├── .env                            # Local secrets — never commit this
├── netlify.toml
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 11. Features Overview

| Feature | Who uses it |
|---------|------------|
| School discovery, search and filter by location | Everyone (public) |
| View school details, showcase image, requirements PDF | Everyone (public) |
| Register new student | Parent |
| Transfer student to another school | Parent |
| Re-register for new academic year | Parent |
| Upload payment proof (PDF) | Parent |
| Student Hub: view all children, search by ID, check status | Parent |
| Review and approve / reject applications | School Admin |
| Assign grade, class stream, generate student ID | School Admin |
| Student Management:  class sheets, clear for new year | School Admin |
| Export class list as PDF | School Admin |
| Chat Inbox:  real-time two-way messaging with read receipts | Parent + School Admin |
| Government Portal: SDMS Excel export (per class + full school) | School Admin |
| School Settings:  logo, showcase image, description, requirements PDF | School Admin |
| Bilingual UI:  English andKinyarwanda | Everyone |

---

## 12. Troubleshooting

### App loads but Supabase calls fail
- Check `.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure you used the `eyJ…` JWT key, not `sb_publishable_…`
- Restart the dev server after editing `.env`: `npm run dev`

### Sign in works but old session shows errors
- Open browser dev tools → Application → Local Storage
- Delete all keys starting with `osr-auth` and reload the page
- Sign in again

### Documents won't open (401 or permission error)
- Make sure `student-documents` is set to public in Supabase → Storage → Edit bucket
- Redeploy the edge function: `supabase functions deploy resolve-document-url`
- Sign out and sign back in to refresh the session token

### Netlify shows "Page not found" on refresh
- Confirm `public/_redirects` contains: `/* /index.html 200`
- Confirm `netlify.toml` has the `[[redirects]]` section
- Redeploy with **Clear cache and deploy site**

### Edge function returns 500
- Check logs in Supabase dashboard → **Edge Functions → resolve-document-url → Logs**
- `SUPABASE_SERVICE_ROLE_KEY` is auto-injected by Supabase — no manual setup needed

### "duplicate key value" error when running SQL queries
- You may have already run that query. Check **Table Editor** to confirm the table or column exists before re-running.
- For enums, use `ADD VALUE IF NOT EXISTS` (already included in Query 12).
