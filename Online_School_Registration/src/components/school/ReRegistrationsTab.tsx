import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { openDocumentReference, splitStoredReferences, createDocumentMarker } from '@/lib/document-access';

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

interface ReRegistrationsTabProps {
  applications: ApplicationWithDetails[];
  schoolId: string;
}

const classStreams = ['A', 'B', 'C', 'D', 'E'];

export function ReRegistrationsTab({ applications, schoolId }: ReRegistrationsTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState('A');

  const { data: school } = useQuery({
    queryKey: ['school-info-rereg', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from('schools').select('name, requirements_pdf_url').eq('id', schoolId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMap = {} } = useQuery({
    queryKey: ['rereg-payments', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase.from('payments').select('student_id, status').eq('school_id', schoolId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { if (!map[p.student_id] || p.status === 'paid') map[p.student_id] = p.status; });
      return map;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ applicationId, studentId, classStream, grade }: { applicationId: string; studentId: string; classStream: string; grade: string }) => {
      const { error: studentError } = await supabase
        .from('students')
        .update({ class_stream: classStream, current_grade: grade, status: 'enrolled' as const })
        .eq('id', studentId);
      if (studentError) throw studentError;

      const { error: appError } = await supabase.from('applications').update({ status: 'approved' }).eq('id', applicationId);
      if (appError) throw appError;
    },
    onSuccess: () => {
      toast({ title: t('rereg.approveSuccess'), description: t('rereg.approveSuccessDesc') });
      if (selectedApp && user) {
        const newClass = selectedApp.transfer_reason?.replace('Moving to ', '') || '';
        supabase.from('students').select('parent_id').eq('id', selectedApp.students.id).single().then(({ data: s }) => {
          if (s) {
            let msg = `🎉 Re-registration approved! ${selectedApp.students.name} (ID: ${selectedApp.students.student_id_code}) has been enrolled in ${newClass} Class ${selectedStream} for the new academic year.\n\nPlease proceed with payment of school fees.`;
            if (school?.requirements_pdf_url) {
              const reqRefs = school.requirements_pdf_url.split(',').map((r: string) => r.trim()).filter(Boolean);
              if (reqRefs.length > 0) {
                msg += `\n\n${createDocumentMarker('school-documents', 'View School Requirements', reqRefs)}`;
              }
            }
            sendSystemMessage({ senderId: user.id, receiverId: s.parent_id, applicationId: selectedApp.id, content: msg });
          }
        });
      }
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
      setApprovalDialog(false);
      setSelectedApp(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleApprove = () => {
    if (!selectedApp) return;
    const newClass = selectedApp.transfer_reason?.replace('Moving to ', '') || selectedApp.students.current_grade || 'Primary 1';
    approveMutation.mutate({ applicationId: selectedApp.id, studentId: selectedApp.students.id, classStream: selectedStream, grade: newClass });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />{t('rereg.approved')}</Badge>;
      case 'rejected': return <Badge className="bg-red-600 text-white"><XCircle className="w-3 h-3 mr-1" />{t('rereg.rejected')}</Badge>;
      default: return <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1" />{t('rereg.pending')}</Badge>;
    }
  };

  const getTranscriptLinks = (url: string | null) => splitStoredReferences(url);

  const openDocument = async (ref: string) => {
    try {
      await openDocumentReference(ref, 'student-documents');
    } catch (error: any) {
      toast({ title: 'Could not open document', description: error?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('rereg.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('rereg.studentName')}</TableHead>
              <TableHead>{t('rereg.studentId')}</TableHead>
              <TableHead>{t('rereg.previousClass')}</TableHead>
              <TableHead>{t('rereg.newClass')}</TableHead>
              <TableHead>{t('rereg.appliedDate')}</TableHead>
              <TableHead>{t('rereg.payment')}</TableHead>
              <TableHead>{t('rereg.status')}</TableHead>
              <TableHead className="text-right">{t('rereg.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">{app.students.name}</TableCell>
                <TableCell className="font-mono text-sm">{app.students.student_id_code || '-'}</TableCell>
                <TableCell>{app.previous_school_name?.replace('Re-registration from ', '') || '-'}</TableCell>
                <TableCell>{app.transfer_reason?.replace('Moving to ', '') || '-'}</TableCell>
                <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {(paymentMap as any)[app.students.id] === 'paid'
                    ? <span className="text-green-700 font-semibold">{t('rereg.paid')}</span>
                    : <span className="text-red-600 font-semibold">{t('rereg.unpaid')}</span>}
                </TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedApp(app); setDetailsDialog(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {app.status === 'pending' && (
                      <Button size="sm" onClick={() => { setSelectedApp(app); setApprovalDialog(true); }}>
                        <CheckCircle className="w-4 h-4 mr-1" />{t('rereg.approve')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-lg">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>{t('rereg.detailsTitle')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="text-muted-foreground">{t('rereg.student')}</label><p className="font-medium">{selectedApp.students.name}</p></div>
                  <div><label className="text-muted-foreground">{t('rereg.id')}</label><p className="font-mono">{selectedApp.students.student_id_code}</p></div>
                  <div><label className="text-muted-foreground">{t('rereg.previousClass')}</label><p>{selectedApp.previous_school_name?.replace('Re-registration from ', '')}</p></div>
                  <div><label className="text-muted-foreground">{t('rereg.newClass')}</label><p>{selectedApp.transfer_reason?.replace('Moving to ', '')}</p></div>
                </div>
                {getTranscriptLinks(selectedApp.transcripts_url).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-muted-foreground">{t('rereg.uploadedTranscripts')}</label>
                    <div className="flex flex-wrap gap-2">
                      {getTranscriptLinks(selectedApp.transcripts_url).map((ref, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => void openDocument(ref)}>
                          <FileText className="w-3 h-3 mr-1" />Doc {i+1}<Download className="w-3 h-3 ml-1" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                {selectedApp.status === 'pending' && (
                  <Button onClick={() => { setDetailsDialog(false); setApprovalDialog(true); }}>
                    <CheckCircle className="w-4 h-4 mr-1" />{t('rereg.approve')}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('rereg.approveTitle')}</DialogTitle>
            <DialogDescription>{t('school.approval.subtitle')} {selectedApp?.students.name} — {selectedApp?.transfer_reason?.replace('Moving to ', '')}</DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">{t('rereg.assignClass')}</label>
            <Select value={selectedStream} onValueChange={setSelectedStream}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {classStreams.map(s => (
                  <SelectItem key={s} value={s}>Class {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>{t('rereg.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
