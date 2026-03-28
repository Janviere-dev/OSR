import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import ChatInbox from '@/components/chat/ChatInbox';
import { Loader2 } from 'lucide-react';

const SchoolInbox = () => {
  const { user, loading, userRole } = useAuth();
  const { t } = useLanguage();

  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['my-school', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('admin_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (loading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (userRole !== 'school_admin') return <Navigate to="/" replace />;
  if (!school) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6">
          <ChatInbox role="school_admin" schoolId={school.id} />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolInbox;
