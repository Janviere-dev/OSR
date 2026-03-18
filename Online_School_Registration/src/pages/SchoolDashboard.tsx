import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { ApplicationManager } from '@/components/school/ApplicationManager';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

const SchoolDashboard = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const location = useLocation();

  const initialTab =
    location.pathname === '/school/students'
      ? 'student-management'
      : location.pathname === '/school/applications'
        ? 'new-applications'
        : 'new-applications';

  // Fetch school data for the admin
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['my-school', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'school_admin') {
    return <Navigate to="/" replace />;
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/30 via-background to-background">
        <div className="max-w-md text-center p-8 rounded-xl border bg-card shadow-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">School Not Found</h2>
          <p className="text-muted-foreground mb-4">
            Your school profile was not created during signup. This can happen if email confirmation was required before your account was fully set up.
          </p>
          <p className="text-sm text-muted-foreground">
            Please sign out and register again, or contact support.
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-secondary/30 via-background to-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {/* Decorative background elements */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
          </div>
          <ApplicationManager schoolId={school.id} schoolName={school.name} initialTab={initialTab} />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolDashboard;
