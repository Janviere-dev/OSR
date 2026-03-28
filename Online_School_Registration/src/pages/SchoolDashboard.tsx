import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Landmark, ChevronRight, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SchoolDashboard = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

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

  // Fetch total applications count
  const { data: appCount = 0 } = useQuery({
    queryKey: ['school-app-count', school?.id],
    queryFn: async () => {
      if (!school) return 0;
      const { count, error } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', school.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!school,
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

  const adminName = school.staff_name || user.user_metadata?.full_name || 'Admin';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-secondary/30 via-background to-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {/* Decorative background */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
          </div>

          <div className="space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-8 lg:p-10 text-primary-foreground shadow-xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">
                  {t('dashboard.welcome')}, {adminName}! 👋
                </h1>
                <p className="text-primary-foreground/80 mt-2 text-lg">{school.name}</p>
                <p className="text-primary-foreground/60 text-sm mt-1">
                  {school.district}, {school.sector}
                </p>
              </div>
            </div>

            {/* Dashboard Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Total Applications Card */}
              <Card 
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                onClick={() => navigate('/school/applications')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-5xl font-bold text-foreground">{appCount}</p>
                  <CardTitle className="text-lg mt-2">{t('school.stats.total')}</CardTitle>
                  <CardDescription className="mt-1">{t('school.welcome.appCardDesc')}</CardDescription>
                </CardContent>
              </Card>

              {/* Government Portal Card */}
              <Card 
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                onClick={() => navigate('/school/government')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                      <Landmark className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">{t('school.welcome.govPortal')}</CardTitle>
                  <CardDescription className="mt-1">{t('school.welcome.govPortalDesc')}</CardDescription>
                </CardContent>
              </Card>

              {/* Student Management Card */}
              <Card 
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                onClick={() => navigate('/school/students')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                      <Users className="w-7 h-7 text-blue-500" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Student Management</CardTitle>
                  <CardDescription className="mt-1">View enrolled students, manage classes, export sheets</CardDescription>
                </CardContent>
              </Card>

              {/* Chat Inbox Card */}
              <Card 
                className="group cursor-pointer border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                onClick={() => navigate('/school/inbox')}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                      <MessageSquare className="w-7 h-7 text-emerald-500" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-lg">Chat Inbox</CardTitle>
                  <CardDescription className="mt-1">Messages from parents about applications & payments</CardDescription>
                </CardContent>
              </Card>

            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolDashboard;
