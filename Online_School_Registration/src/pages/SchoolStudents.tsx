import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { StudentManagementTab } from '@/components/school/StudentManagementTab';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const SchoolStudents = () => {
  const { user, loading: authLoading, userRole } = useAuth();

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

  if (!user) return <Navigate to="/auth" replace />;
  if (userRole !== 'school_admin') return <Navigate to="/" replace />;
  if (!school) return <Navigate to="/school/register" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-secondary/30 via-background to-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="space-y-6 animate-fade-in">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-xl">
              <h1 className="text-2xl lg:text-3xl font-display font-bold">{school.name} — Student Management</h1>
            </div>
            <StudentManagementTab schoolId={school.id} />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolStudents;
