import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthError, PostgrestError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type ContextError = AuthError | PostgrestError | Error | null;

interface SchoolData {
  name: string;
  staffName: string;
  staffRole?: string;
  qualifications?: string;
  province: string;
  district: string;
  sector: string;
  logoFile?: File | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string, 
    password: string, 
    fullName: string, 
    role: 'parent' | 'school_admin',
    schoolData?: SchoolData
  ) => Promise<{ error: ContextError; requiresEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: ContextError }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: ContextError }>;
  signOut: () => Promise<void>;
  userRole: 'parent' | 'school_admin' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'parent' | 'school_admin' | null>(null);

  async function fetchUserRole(userId: string) {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (data && !error) {
      setUserRole(data.role as 'parent' | 'school_admin');
    }
  }

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        void event;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fetch user role when session changes
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchUserRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const uploadSchoolLogo = async (file: File, schoolId: string): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      // During signup, email confirmation may leave user unauthenticated.
      // In that case storage RLS blocks upload; skip and let admin upload later.
      return null;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${schoolId}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('school-logos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading logo:', uploadError);
      return null;
    }

    const { data } = supabase.storage
      .from('school-logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: 'parent' | 'school_admin',
    schoolData?: SchoolData
  ) => {
    try {
      const redirectUrl = `${window.location.origin}/`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) return { error, requiresEmailConfirmation: false };
      if (!data.user) {
        return {
          error: new Error('Account was created, but no user was returned. Please try signing in.'),
          requiresEmailConfirmation: false,
        };
      }

      // Supabase may return an obfuscated user object for an already-registered email
      // when email confirmation is enabled. In that case `identities` is typically empty.
      if (!data.session && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          error: new Error('This email is already registered. Please sign in or use password reset.'),
          requiresEmailConfirmation: false,
        };
      }

      const userId = data.user.id;
      const { data: sessionData } = await supabase.auth.getSession();
      const canUseDirectInsert = sessionData.session?.user?.id === userId;

      // First try RPC, then fallback to direct insert when session exists
      const { error: roleRpcError } = await supabase
        .rpc('assign_user_role', { p_user_id: userId, p_role: role });

      if (roleRpcError) {
        if (roleRpcError.code === '23503') {
          return {
            error: new Error('This email is already registered. Please sign in instead of creating a new account.'),
            requiresEmailConfirmation: false,
          };
        }

        if (!canUseDirectInsert) {
          console.error('Error creating user role:', roleRpcError);
            return { error: roleRpcError, requiresEmailConfirmation: false };
        }

        const { error: roleInsertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (roleInsertError) {
          console.error('Error creating user role:', roleInsertError);
          return { error: roleInsertError, requiresEmailConfirmation: false };
        }
      }

      // If school admin, create the school record
      if (role === 'school_admin' && schoolData) {
        let createdSchoolId: string | null = null;

        const { data: schoolId, error: schoolRpcError } = await supabase
          .rpc('create_school_for_admin', {
            p_name: schoolData.name,
            p_staff_name: schoolData.staffName,
            p_qualifications: schoolData.qualifications || null,
            p_province: schoolData.province,
            p_district: schoolData.district,
            p_sector: schoolData.sector,
            p_admin_id: userId,
            p_is_approved: true,
          });

        if (!schoolRpcError && schoolId) {
          createdSchoolId = schoolId;
        } else {
          if (!canUseDirectInsert) {
            console.error('Error creating school:', schoolRpcError);
            return { error: schoolRpcError, requiresEmailConfirmation: false };
          }

          const { data: insertedSchool, error: schoolInsertError } = await supabase
            .from('schools')
            .insert({
              name: schoolData.name,
              staff_name: schoolData.staffName,
              qualifications: schoolData.qualifications || null,
              province: schoolData.province,
              district: schoolData.district,
              sector: schoolData.sector,
              admin_id: userId,
              is_approved: true,
            })
            .select('id')
            .single();

          if (schoolInsertError) {
            console.error('Error creating school:', schoolInsertError);
            return { error: schoolInsertError, requiresEmailConfirmation: false };
          }

          createdSchoolId = insertedSchool.id;
        }

        // Upload logo if provided
        if (schoolData.logoFile && createdSchoolId) {
          const logoUrl = await uploadSchoolLogo(schoolData.logoFile, createdSchoolId);

          if (logoUrl) {
            await supabase
              .from('schools')
              .update({ logo_url: logoUrl })
              .eq('id', createdSchoolId);
          }
        }
      }

      return { error: null, requiresEmailConfirmation: !data.session };
    } catch (error) {
      if (error instanceof Error) {
        return { error, requiresEmailConfirmation: false };
      }

      return {
        error: new Error('Unexpected signup error. Please try again.'),
        requiresEmailConfirmation: false,
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, resendConfirmationEmail, signOut, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}