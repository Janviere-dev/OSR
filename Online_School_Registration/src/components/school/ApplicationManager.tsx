import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  UserPlus,
  ArrowRightLeft,
  Users,
  Clock,
  FileText
} from 'lucide-react';
import { NewApplicationsTab } from './NewApplicationsTab';
import { TransfersTab } from './TransfersTab';
import { StudentManagementTab } from './StudentManagementTab';

interface ApplicationManagerProps {
  schoolId: string;
  schoolName: string;
  initialTab?: 'new-applications' | 'transfers' | 'student-management';
}

interface ApplicationWithDetails {
  id: string;
  type: 'new' | 'transfer';
  status: string;
  created_at: string;
  transcripts_url: string | null;
  proof_payment_url: string | null;
  momo_id: string | null;
  previous_school_name: string | null;
  transfer_reason: string | null;
  students: {
    id: string;
    name: string;
    dob: string;
    current_grade: string | null;
    mother_name: string | null;
    father_name: string | null;
    status: string;
    class_stream: string | null;
    student_id_code: string | null;
  };
}

export function ApplicationManager({ schoolId, schoolName, initialTab = 'new-applications' }: ApplicationManagerProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Fetch applications for this school
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['school-applications', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          type,
          status,
          created_at,
          transcripts_url,
          proof_payment_url,
          momo_id,
          previous_school_name,
          transfer_reason,
          students!inner(
            id,
            name,
            dob,
            current_grade,
            mother_name,
            father_name,
            status,
            class_stream,
            student_id_code
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ApplicationWithDetails[];
    },
  });

  const pendingNewApps = applications.filter(a => a.type === 'new' && a.status === 'pending').length;
  const pendingTransfers = applications.filter(a => a.type === 'transfer' && a.status === 'pending').length;
  const totalPending = pendingNewApps + pendingTransfers;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with gradient accent */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 lg:p-8 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">
              {t('school.dashboard.title')}
            </h1>
            <p className="text-primary-foreground/80 mt-1 text-lg">{schoolName}</p>
          </div>
          {totalPending > 0 && (
            <div className="flex items-center gap-2 bg-primary-foreground/20 backdrop-blur-sm px-5 py-3 rounded-full border border-primary-foreground/20 shadow-lg">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{totalPending} {t('school.pending.count')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards with hover effects */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.total')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.pending')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2 text-accent">{totalPending}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-osr-sky/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.newApps')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-sky))]/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[hsl(var(--osr-sky))]" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{applications.filter(a => a.type === 'new').length}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--osr-gold))]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.transfers')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-gold))]/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-[hsl(var(--osr-gold))]" />
              </div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{applications.filter(a => a.type === 'transfer').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs with modern styling */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
          <CardTitle className="text-xl font-display">{t('school.tabs.title')}</CardTitle>
          <CardDescription>{t('school.tabs.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 h-auto rounded-xl">
              <TabsTrigger 
                value="new-applications" 
                className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{t('school.tabs.newApps')}</span>
                {pendingNewApps > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">
                    {pendingNewApps}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="transfers" 
                className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{t('school.tabs.transfers')}</span>
                {pendingTransfers > 0 && (
                  <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">
                    {pendingTransfers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="student-management" 
                className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{t('school.tabs.students')}</span>
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="new-applications" className="animate-fade-in">
                <NewApplicationsTab applications={applications} schoolId={schoolId} />
              </TabsContent>
              <TabsContent value="transfers" className="animate-fade-in">
                <TransfersTab applications={applications} schoolId={schoolId} />
              </TabsContent>
              <TabsContent value="student-management" className="animate-fade-in">
                <StudentManagementTab schoolId={schoolId} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
