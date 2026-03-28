# Online School Registration (OSR) — Rwanda

A full-stack web application for managing school registrations, student transfers, payments, and government reporting across Rwanda. Built with React, Vite, Supabase, and Tailwind CSS.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone the Project](#2-clone-the-project)
3. [Supabase Project Setup](#3-supabase-project-setup)
4. [Storage Buckets](#4-storage-buckets)
5. [Database Schema](#5-database-schema)
6. [Row Level Security](#6-row-level-security)
7. [Environment Variables](#7-environment-variables)
8. [Install & Run Locally](#8-install--run-locally)
9. [Deploy the Edge Function](#9-deploy-the-edge-function)
10. [First Login & Roles](#10-first-login--roles)
11. [Deploy to Netlify](#11-deploy-to-netlify)
12. [Project Structure](#12-project-structure)
13. [Features Overview](#13-features-overview)
14. [Troubleshooting](#14-troubleshooting)

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
```

---

## 3. Supabase Project Setup

### Step 1 — Create a project

1. Go to https://app.supabase.com and sign in (create a free account if needed).
2. Click **New Project**.
3. Fill in: name, database password, region. Click **Create new project**.
4. Wait ~2 minutes for provisioning to complete.

### Step 2 — Get your API keys

1. In your project, go to **Settings → API**.
2. Copy:
   - **Project URL** — e.g. `https://xxxxxxxxxxxxxxxxxxxx.supabase.co`
   - **anon / public** key — the long `eyJ…` JWT string

> **Important:** Use the `eyJ…` key (labeled "anon / public"), NOT the `sb_publishable_…` key. The publishable key format does not work with Supabase JS v2.

---

## 4. Storage Buckets

In your Supabase dashboard go to **Storage → New bucket** and create these two:

| Bucket name | Set as Public? | Purpose |
|-------------|---------------|---------|
| `student-documents` | ✅ Yes | Transcripts and payment proofs uploaded by parents |
| `school-documents` | ✅ Yes | Requirement PDFs uploaded by school admins |

To make a bucket public: click the bucket → **Edit bucket** → enable **Public bucket** → Save.

---

## 5. Database Schema

In your Supabase dashboard go to **SQL Editor → New query**, paste the SQL below, and click **Run**.

```sql
-- Enums
create type application_type as enum ('new', 'transfer');

-- Profiles (synced with auth.users via trigger)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text
);

-- User roles
create table user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'school_admin'))
);

-- Schools
create table schools (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id),
  name text not null,
  staff_name text,
  province text,
  district text,
  sector text,
  logo_url text,
  showcase_image_url text,
  requirements_pdf_url text,
  description text,
  is_approved boolean default true
);

-- Students
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references auth.users(id),
  school_id uuid references schools(id),
  name text not null,
  dob date not null,
  mother_name text,
  father_name text,
  mother_phone text,
  father_phone text,
  parent_phone text,
  parent_email text,
  current_grade text,
  class_stream text,
  student_id_code text,
  status text default 'pending'
);

-- Applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  school_id uuid references schools(id),
  type application_type default 'new',
  status text default 'pending',
  transcripts_url text,
  proof_payment_url text,
  momo_id text,
  previous_school_name text,
  transfer_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id),
  school_id uuid references schools(id),
  parent_id uuid references auth.users(id),
  status text default 'unpaid',
  proof_payment_url text,
  amount integer,
  description text,
  momo_id text,
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id),
  receiver_id uuid references auth.users(id),
  application_id uuid references applications(id),
  content text not null,
  is_system boolean default false,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Trigger: auto-create profile when a user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

---

## 6. Row Level Security

Still in the **SQL Editor**, run this second query to enable RLS and add access policies:

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table user_roles enable row level security;
alter table schools enable row level security;
alter table students enable row level security;
alter table applications enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;

-- Profiles
create policy "Own profile" on profiles for all using (auth.uid() = user_id);

-- User roles
create policy "Own role read" on user_roles for select using (auth.uid() = user_id);
create policy "Own role insert" on user_roles for insert with check (auth.uid() = user_id);

-- Schools: anyone can read, admin manages their own
create policy "Schools public read" on schools for select using (true);
create policy "School admin insert" on schools for insert with check (auth.uid() = admin_id);
create policy "School admin update" on schools for update using (auth.uid() = admin_id);

-- Students
create policy "Parent owns students" on students for all
  using (auth.uid() = parent_id);
create policy "School reads students" on students for select
  using (school_id in (select id from schools where admin_id = auth.uid()));
create policy "School updates students" on students for update
  using (school_id in (select id from schools where admin_id = auth.uid()));

-- Applications
create policy "Parent applications" on applications for all
  using (student_id in (select id from students where parent_id = auth.uid()));
create policy "School applications" on applications for all
  using (school_id in (select id from schools where admin_id = auth.uid()));

-- Payments
create policy "Parent payments" on payments for all using (auth.uid() = parent_id);
create policy "School payments" on payments for all
  using (school_id in (select id from schools where admin_id = auth.uid()));

-- Messages
create policy "Own messages" on messages for all
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
```

---

## 7. Environment Variables

Create a `.env` file in the project root:

```bash
# In the Online_School_Registration/ folder:
touch .env
```

Add the following (replace the placeholders with your actual values from step 3):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The `.env` file is listed in `.gitignore` and will never be committed.

---

## 8. Install & Run Locally

```bash
# From inside the project folder:
npm install
npm run dev
```

Open your browser at **http://localhost:5173**

### Other commands

```bash
npm run build       # Build for production → dist/
npm run preview     # Preview the production build at localhost:4173
npm run typecheck   # Check TypeScript types
npm run lint        # Run ESLint
```

---

## 9. Deploy the Edge Function

The edge function `resolve-document-url` creates signed URLs for private documents.

### Step 1 — Log in to Supabase CLI

```bash
supabase login
# A browser window will open for authentication
```

### Step 2 — Link your project

```bash
# Run this from inside the project folder
supabase link --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the part of your Supabase URL between `https://` and `.supabase.co`.

### Step 3 — Deploy

```bash
supabase functions deploy resolve-document-url
```

Expected output:
```
Deployed Function resolve-document-url on project YOUR_PROJECT_REF
```

The environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are automatically injected by Supabase — no manual setup required.

---

## 10. First Login & Roles

1. Open http://localhost:5173
2. Click **Sign Up**
3. Select your role:
   - **Parent** — register and manage your children's school applications
   - **School Administrator** — manage a school, review applications, export SDMS reports
4. School admins will be prompted to complete their school profile on first login

---

## 11. Deploy to Netlify

The project already includes `netlify.toml` and `public/_redirects` for SPA routing.

### Steps

1. Push your code to GitHub/GitLab.
2. Go to https://app.netlify.com → **Add new site → Import from Git**.
3. Select your repository.
4. Netlify auto-detects the build settings from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Go to **Site settings → Environment variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy site**.

After deploy, also redeploy the edge function pointing to production (same `supabase functions deploy` command works as long as you're linked to the production project).

---

## 12. Project Structure

```
Online_School_Registration/
├── public/
│   └── _redirects              # Netlify SPA redirect rule
├── src/
│   ├── assets/                 # Images (gov-logo.png, etc.)
│   ├── components/
│   │   ├── chat/
│   │   │   └── ChatInbox.tsx   # Real-time messaging UI
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
│   │   └── ui/                 # Shadcn/Radix UI components
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth state and role management
│   │   └── LanguageContext.tsx  # EN / Kinyarwanda translations
│   ├── hooks/
│   │   └── useSendSystemMessage.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts       # Supabase client setup
│   │       └── types.ts        # Auto-generated DB types
│   ├── lib/
│   │   └── document-access.ts  # Signed URL helpers & message markers
│   ├── pages/
│   │   ├── Index.tsx
│   │   ├── Auth.tsx
│   │   ├── ParentDashboard.tsx
│   │   ├── SchoolDashboard.tsx
│   │   ├── SchoolApplications.tsx
│   │   ├── SchoolStudents.tsx
│   │   ├── SchoolGovernment.tsx  # SDMS export
│   │   ├── SchoolSettings.tsx
│   │   └── SchoolInbox.tsx
│   └── data/
│       └── rwanda-locations.ts   # Provinces, districts, sectors
├── supabase/
│   └── functions/
│       └── resolve-document-url/
│           └── index.ts          # Edge function (Deno)
├── .env                          # Local secrets — never commit this
├── netlify.toml
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 13. Features Overview

| Feature | Who uses it |
|---------|------------|
| School discovery & details | Everyone (public) |
| Register new student | Parent |
| Transfer student to another school | Parent |
| Re-register for new academic year | Parent |
| Upload payment proof (PDF) | Parent |
| Student Hub — view all children & status | Parent |
| Review & approve/reject applications | School Admin |
| Assign grade, class stream, generate student ID | School Admin |
| Student Management — class sheets, clear for new year | School Admin |
| Chat Inbox — real-time messaging with read receipts | Both |
| Government Portal — SDMS Excel export (all classes) | School Admin |
| Bilingual UI — English & Kinyarwanda | Everyone |

---

## 14. Troubleshooting

### App loads but Supabase calls fail
- Check `.env` has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Make sure you used the `eyJ…` JWT key, not `sb_publishable_…`
- Restart the dev server after editing `.env`

### Sign in works but old session shows errors
- Open browser dev tools → Application → Local Storage
- Delete all keys starting with `osr-auth` and reload the page
- Sign in again

### Documents won't open (401 error)
- Make sure both storage buckets are set to **Public** in Supabase → Storage
- Redeploy the edge function: `supabase functions deploy resolve-document-url`
- Sign out and sign back in to refresh the session token

### Netlify shows "Page not found" on refresh
- Confirm `public/_redirects` contains: `/* /index.html 200`
- Confirm `netlify.toml` has the `[[redirects]]` section
- Redeploy with **Clear cache and deploy site**

### Edge function returns 500
- Check function logs in Supabase dashboard → Edge Functions → resolve-document-url → Logs
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is available (it is auto-injected by Supabase)
