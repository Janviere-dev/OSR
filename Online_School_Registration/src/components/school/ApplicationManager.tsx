import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2, UserPlus, ArrowRightLeft, Clock, FileText, RefreshCw
} from 'lucide-react';
import { NewApplicationsTab } from './NewApplicationsTab';
import { TransfersTab } from './TransfersTab';
import { ReRegistrationsTab } from './ReRegistrationsTab';

interface ApplicationManagerProps {
  schoolId: string;
  schoolName: string;
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
    mother_phone: string | null;
    father_phone: string | null;
    parent_phone: string | null;
    parent_email: string | null;
    status: string;
    class_stream: string | null;
    student_id_code: string | null;
  };
}

export function ApplicationManager({ schoolId, schoolName }: ApplicationManagerProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('new-applications');

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['school-applications', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, type, status, created_at, transcripts_url, proof_payment_url, momo_id,
          previous_school_name, transfer_reason,
          students!inner(
            id, name, dob, current_grade, mother_name, father_name,
            mother_phone, father_phone, parent_phone, parent_email,
            status, class_stream, student_id_code
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as ApplicationWithDetails[]).filter((application) => application.status !== 'archived');
    },
  });

  const newApplications = applications.filter(a => a.type === 'new' && !a.previous_school_name?.startsWith('Re-registration'));
  const reRegistrations = applications.filter(a => a.type === 'new' && a.previous_school_name?.startsWith('Re-registration'));
  const transferApplications = applications.filter(a => a.type === 'transfer');

  const pendingNewApps = newApplications.filter(a => a.status === 'pending').length;
  const pendingTransfers = transferApplications.filter(a => a.status === 'pending').length;
  const pendingRereg = reRegistrations.filter(a => a.status === 'pending').length;
  const totalPending = pendingNewApps + pendingTransfers + pendingRereg;

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 lg:p-8 text-primary-foreground shadow-xl">
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">{t('school.dashboard.title')}</h1>
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

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.total')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.newApps')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-sky))]/10 flex items-center justify-center"><UserPlus className="w-5 h-5 text-[hsl(var(--osr-sky))]" /></div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{newApplications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">{t('school.stats.transfers')}</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-gold))]/10 flex items-center justify-center"><ArrowRightLeft className="w-5 h-5 text-[hsl(var(--osr-gold))]" /></div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{transferApplications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-sm font-medium">Re-registrations</CardDescription>
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><RefreshCw className="w-5 h-5 text-accent-foreground" /></div>
            </div>
            <CardTitle className="text-4xl font-bold mt-2">{reRegistrations.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
          <CardTitle className="text-xl font-display">{t('school.tabs.title')}</CardTitle>
          <CardDescription>{t('school.tabs.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 h-auto rounded-xl">
              <TabsTrigger value="new-applications" className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{t('school.tabs.newApps')}</span>
                {pendingNewApps > 0 && <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">{pendingNewApps}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="transfers" className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
                <ArrowRightLeft className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">{t('school.tabs.transfers')}</span>
                {pendingTransfers > 0 && <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">{pendingTransfers}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="re-registrations" className="gap-2 py-3 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all">
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Re-register</span>
                {pendingRereg > 0 && <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">{pendingRereg}</Badge>}
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="new-applications" className="animate-fade-in">
                <NewApplicationsTab applications={newApplications} schoolId={schoolId} />
              </TabsContent>
              <TabsContent value="transfers" className="animate-fade-in">
                <TransfersTab applications={applications} schoolId={schoolId} />
              </TabsContent>
              <TabsContent value="re-registrations" className="animate-fade-in">
                <ReRegistrationsTab applications={reRegistrations} schoolId={schoolId} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
