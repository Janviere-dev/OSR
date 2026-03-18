-- Security definer function to assign a role to a newly signed-up user.
-- Bypasses RLS so it works even before the user has a confirmed session.
CREATE OR REPLACE FUNCTION public.assign_user_role(p_user_id UUID, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, p_role::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Security definer function to create a school record on behalf of a new admin.
-- Bypasses RLS for the same reason.
CREATE OR REPLACE FUNCTION public.create_school_for_admin(
  p_name text,
  p_staff_name text,
  p_qualifications text,
  p_province text,
  p_district text,
  p_sector text,
  p_admin_id UUID,
  p_is_approved boolean DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school_id UUID;
BEGIN
  INSERT INTO public.schools (name, staff_name, qualifications, province, district, sector, admin_id, is_approved)
  VALUES (p_name, p_staff_name, p_qualifications, p_province, p_district, p_sector, p_admin_id, p_is_approved)
  RETURNING id INTO v_school_id;

  RETURN v_school_id;
END;
$$;
