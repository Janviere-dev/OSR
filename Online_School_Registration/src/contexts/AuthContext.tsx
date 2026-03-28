import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  ) => Promise<{ error: unknown }>; 
  signIn: (email: string, password: string) => Promise<{ error: unknown }>; 
  signOut: () => Promise<void>;
  userRole: 'parent' | 'school_admin' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'parent' | 'school_admin' | null>(null);

  // Fetch user role from Supabase
  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } else {
        setUserRole(data?.role ?? null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user role:', err);
      setUserRole(null);
    }
  };


  // fetchUserRole is defined below useEffect to avoid redeclaration

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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

  // (removed duplicate fetchUserRole)

  const uploadSchoolLogo = async (file: File, schoolId: string): Promise<string | null> => {
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

    if (error) return { error };

    // Create user role after successful signup
    if (data.user) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: data.user.id, role });

      if (roleError) {
        console.error('Error creating user role:', roleError);
        return { error: roleError };
      }

      // If school admin, create the school record
      if (role === 'school_admin' && schoolData) {
        // First create the school to get its ID
        const { data: schoolResult, error: schoolError } = await supabase
          .from('schools')
          .insert({
            name: schoolData.name,
            staff_name: schoolData.staffName,
            qualifications: schoolData.qualifications || null,
            province: schoolData.province,
            district: schoolData.district,
            sector: schoolData.sector,
            admin_id: data.user.id,
            is_approved: true, // Auto-approve for now
          })
          .select()
          .single();

        if (schoolError) {
          console.error('Error creating school:', schoolError);
          return { error: schoolError };
        }

        // Upload logo if provided
        if (schoolData.logoFile && schoolResult) {
          const logoUrl = await uploadSchoolLogo(schoolData.logoFile, schoolResult.id);
          
          if (logoUrl) {
            await supabase
              .from('schools')
              .update({ logo_url: logoUrl })
              .eq('id', schoolResult.id);
          }
        }
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, userRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// Move useAuth to a separate file if you want fast refresh to work perfectly, or ignore this warning if not critical.
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}