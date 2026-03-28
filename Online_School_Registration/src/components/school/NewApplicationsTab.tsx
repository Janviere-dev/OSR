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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, CheckCircle, XCircle, FileText, CreditCard, Clock, AlertCircle, Download } from 'lucide-react';
import { format } from 'date-fns';
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { openDocumentReference, splitStoredReferences } from '@/lib/document-access';

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

interface NewApplicationsTabProps {
  applications: ApplicationWithDetails[];
  schoolId: string;
}

const classStreams = ['A', 'B', 'C', 'D', 'E'];

const generateStudentId = (schoolId: string): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `STU${year}${random}`;
};

export function NewApplicationsTab({ applications, schoolId }: NewApplicationsTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState('A');
  const [rejectionReason, setRejectionReason] = useState('');

  const newApplications = applications.filter(app => app.type === 'new');

  const { data: school } = useQuery({
    queryKey: ['school-info', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('name, requirements_pdf_url')
        .eq('id', schoolId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMap = {} } = useQuery({
    queryKey: ['app-payments', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('student_id, status, proof_payment_url')
        .eq('school_id', schoolId);
      if (error) throw error;
      const map: Record<string, { status: string; proof_url: string | null }> = {};
      data?.forEach((p: any) => {
        if (!map[p.student_id] || p.status === 'paid') {
          map[p.student_id] = { status: p.status, proof_url: p.proof_payment_url };
        }
      });
      return map;
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ studentId, newStatus }: { studentId: string; newStatus: string }) => {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('payments')
          .update({ status: newStatus })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-payments', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
    },
    onError: (error: Error) => {
      toast({ title: t('school.approval.error'), description: error.message, variant: 'destructive' });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ applicationId, studentId, classStream, grade }: { applicationId: string; studentId: string; classStream: string; grade: string }) => {
      const studentIdCode = generateStudentId(schoolId);

      const { error: studentError } = await supabase
        .from('students')
        .update({
          status: 'enrolled',
          class_stream: classStream,
          current_grade: grade,
          student_id_code: studentIdCode,
          school_id: schoolId,
        })
        .eq('id', studentId);
      if (studentError) throw studentError;

      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
      if (appError) throw appError;

      return { studentIdCode };
    },
    onSuccess: async ({ studentIdCode }) => {
      toast({
        title: t('school.approval.success'),
        description: `${t('school.newApps.studentIdGenerated')}: ${studentIdCode}`,
      });

      if (selectedApp && user) {
        const { data: s } = await supabase.from('students').select('parent_id').eq('id', selectedApp.students.id).single();
        if (s) {
          const { createDocumentMarker } = await import('@/lib/document-access');
          const reqRefs = school?.requirements_pdf_url
            ? school.requirements_pdf_url.split(',').map((r: string) => r.trim()).filter(Boolean)
            : [];
          let content = `🎉 Application approved!\n\n${selectedApp.students.name} (ID: ${studentIdCode}) has been accepted.\n\nPlease proceed with payment of school fees.`;
          if (reqRefs.length > 0) {
            content += `\n\n${createDocumentMarker('school-documents', 'View School Requirements', reqRefs)}`;
          }
          await sendSystemMessage({ senderId: user.id, receiverId: s.parent_id, applicationId: selectedApp.id, content });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
      setApprovalDialog(false);
      setDetailsDialog(false);
      setSelectedApp(null);
    },
    onError: (error: Error) => {
      toast({ title: t('school.approval.error'), description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from('applications')
        .update({ status: 'rejected', transfer_reason: reason })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('school.newApps.rejectSuccess'), description: t('school.newApps.rejectSuccessDesc') });
      if (selectedApp && user) {
        supabase.from('students').select('parent_id').eq('id', selectedApp.students.id).single()
          .then(({ data: s }) => {
            if (s) {
              sendSystemMessage({
                senderId: user.id,
                receiverId: s.parent_id,
                applicationId: selectedApp.id,
                content: `❌ Application for ${selectedApp.students.name} was rejected. Reason: ${rejectionReason}. Please check and re-upload documents.`,
              });
            }
          });
      }
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      setRejectDialog(false);
      setSelectedApp(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({ title: t('school.approval.error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleApprove = () => {
    if (!selectedApp) return;
    approveMutation.mutate({
      applicationId: selectedApp.id,
      studentId: selectedApp.students.id,
      classStream: selectedStream,
      grade: selectedApp.students.current_grade || 'Primary 1',
    });
  };

  const handleReject = () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    rejectMutation.mutate({ applicationId: selectedApp.id, reason: rejectionReason });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white border-green-600"><CheckCircle className="w-3 h-3 mr-1" />{t('school.status.approved')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white border-red-600"><XCircle className="w-3 h-3 mr-1" />{t('school.status.rejected')}</Badge>;
      case 'enrolled':
        return <Badge className="bg-blue-600 text-white border-blue-600"><CheckCircle className="w-3 h-3 mr-1" />Enrolled</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white border-amber-500"><Clock className="w-3 h-3 mr-1" />{t('school.status.pending')}</Badge>;
    }
  };

  const getPaymentBadge = (studentId: string) => {
    const payment = (paymentMap as any)[studentId];
    if (payment?.status === 'paid') {
      return <span className="text-green-700 font-semibold">{t('school.payment.paid')}</span>;
    }
    return <span className="text-red-600 font-semibold">{t('school.payment.unpaid')}</span>;
  };

  const getTranscriptLinks = (url: string | null) => splitStoredReferences(url);

  const openDocument = async (ref: string) => {
    try {
      await openDocumentReference(ref, 'student-documents');
    } catch (error: any) {
      toast({
        title: 'Could not open document',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (newApplications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('school.newApps.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('school.table.student')}</TableHead>
              <TableHead>{t('school.table.grade')}</TableHead>
              <TableHead>{t('school.table.date')}</TableHead>
              <TableHead>{t('school.table.payment')}</TableHead>
              <TableHead>{t('school.table.status')}</TableHead>
              <TableHead className="text-right">{t('school.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {newApplications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{app.students.name}</p>
                    <p className="text-xs text-muted-foreground">DOB: {format(new Date(app.students.dob), 'MMM d, yyyy')}</p>
                  </div>
                </TableCell>
                <TableCell>{app.students.current_grade || '-'}</TableCell>
                <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  <Select
                    value={(paymentMap as any)[app.students.id]?.status || 'unpaid'}
                    onValueChange={(val) => updatePaymentMutation.mutate({ studentId: app.students.id, newStatus: val })}
                  >
                    <SelectTrigger className="w-[110px] h-8">
                      <SelectValue>{getPaymentBadge(app.students.id)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid"><span className="text-green-700 font-medium">{t('school.payment.paid')}</span></SelectItem>
                      <SelectItem value="unpaid"><span className="text-red-600 font-medium">{t('school.payment.unpaid')}</span></SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedApp(app); setDetailsDialog(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {app.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => { setSelectedApp(app); setApprovalDialog(true); }}>
                          <CheckCircle className="w-4 h-4 mr-1" />{t('school.action.approve')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setSelectedApp(app); setRejectDialog(true); }}>
                          <XCircle className="w-4 h-4 mr-1" />{t('school.action.reject')}
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>{t('school.details.title')}</DialogTitle>
                <DialogDescription>{t('school.details.subtitle')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('school.details.studentName')}</label>
                    <p className="font-medium">{selectedApp.students.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('school.details.dob')}</label>
                    <p>{format(new Date(selectedApp.students.dob), 'MMMM d, yyyy')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('school.details.grade')}</label>
                    <p>{selectedApp.students.current_grade || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">{t('school.table.status')}</label>
                    <div className="mt-1">{getStatusBadge(selectedApp.status)}</div>
                  </div>
                  {selectedApp.students.student_id_code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('school.students.studentId')}</label>
                      <p className="font-mono">{selectedApp.students.student_id_code}</p>
                    </div>
                  )}
                  {selectedApp.students.class_stream && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('school.students.class')}</label>
                      <p>Class {selectedApp.students.class_stream}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">Parent Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedApp.students.mother_name && (
                      <div>
                        <label className="text-muted-foreground">{t('school.details.mother')}</label>
                        <p className="font-medium">{selectedApp.students.mother_name}</p>
                      </div>
                    )}
                    {selectedApp.students.mother_phone && (
                      <div>
                        <label className="text-muted-foreground">{t('register.motherPhone')}</label>
                        <p className="font-medium">{selectedApp.students.mother_phone}</p>
                      </div>
                    )}
                    {selectedApp.students.father_name && (
                      <div>
                        <label className="text-muted-foreground">{t('school.details.father')}</label>
                        <p className="font-medium">{selectedApp.students.father_name}</p>
                      </div>
                    )}
                    {selectedApp.students.father_phone && (
                      <div>
                        <label className="text-muted-foreground">{t('register.fatherPhone')}</label>
                        <p className="font-medium">{selectedApp.students.father_phone}</p>
                      </div>
                    )}
                    {selectedApp.students.parent_email && (
                      <div>
                        <label className="text-muted-foreground">{t('register.parentEmail')}</label>
                        <p className="font-medium">{selectedApp.students.parent_email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedApp.previous_school_name?.startsWith('Re-registration') && (
                  <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
                    <h4 className="font-medium">Re-registration Details</h4>
                    <p className="text-sm"><strong>Previous Class:</strong> {selectedApp.previous_school_name?.replace('Re-registration from ', '')}</p>
                    <p className="text-sm"><strong>New Class:</strong> {selectedApp.transfer_reason?.replace('Moving to ', '')}</p>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">{t('school.newApps.documents')}</h4>
                  {(() => {
                    const transcriptLinks = getTranscriptLinks(selectedApp.transcripts_url);
                    if (transcriptLinks.length > 0) {
                      return (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">Uploaded Documents ({transcriptLinks.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {transcriptLinks.map((ref, i) => (
                              <Button key={i} variant="outline" size="sm" onClick={() => void openDocument(ref)}>
                                <FileText className="w-4 h-4 mr-2" />
                                Document {i + 1}
                                <Download className="w-3 h-3 ml-2" />
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return <p className="text-sm text-muted-foreground">{t('school.newApps.noTranscripts')}</p>;
                  })()}

                  {splitStoredReferences((paymentMap as any)[selectedApp.students.id]?.proof_url)[0] && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Payment Proof</p>
                      <Button variant="outline" size="sm" onClick={() => void openDocument(splitStoredReferences((paymentMap as any)[selectedApp.students.id].proof_url)[0])}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        View Payment Proof
                        <Download className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => { setDetailsDialog(false); setRejectDialog(true); }}>
                      <XCircle className="w-4 h-4 mr-1" />{t('school.action.reject')}
                    </Button>
                    <Button onClick={() => { setDetailsDialog(false); setApprovalDialog(true); }}>
                      <CheckCircle className="w-4 h-4 mr-1" />{t('school.action.approve')}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.newApps.approveTitle')}</DialogTitle>
            <DialogDescription>{t('school.newApps.approveDesc')} {selectedApp?.students.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.approval.stream')}</label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classStreams.map((stream) => (
                    <SelectItem key={stream} value={stream}>
                      {selectedApp?.students.current_grade || 'Primary 1'} - {t('school.approval.class')} {stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{t('school.newApps.idWillGenerate')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>{t('school.approval.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.newApps.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('school.newApps.rejectDesc')} {selectedApp?.students.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.newApps.rejectionReason')}</label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder={t('school.newApps.rejectionPlaceholder')} rows={3} />
              <p className="text-xs text-muted-foreground mt-1">{t('school.newApps.rejectionHint')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectionReason.trim()}>
              {t('school.newApps.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
