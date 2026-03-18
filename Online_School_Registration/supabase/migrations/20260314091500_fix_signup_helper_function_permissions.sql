-- Ensure signup helper RPC functions are executable from the client context.
-- This avoids signup failures when role/school setup is called before a confirmed session exists.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assign_user_role(UUID, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_school_for_admin(
  text,
  text,
  text,
  text,
  text,
  text,
  UUID,
  boolean
) TO anon, authenticated;
