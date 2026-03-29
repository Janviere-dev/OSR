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
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { Eye, CheckCircle, XCircle, FileText, CreditCard, Clock, AlertCircle, Building2 } from 'lucide-react';
import { format } from 'date-fns';
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

interface TransfersTabProps {
  applications: ApplicationWithDetails[];
  schoolId: string;
}

const classStreams = ['A', 'B', 'C', 'D', 'E'];
const grades = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6'
];

const generateStudentId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TRF${year}${random}`;
};

export function TransfersTab({ applications, schoolId }: TransfersTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [acceptDialog, setAcceptDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState('A');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const transferApplications = applications.filter(app => app.type === 'transfer');

  const { data: school } = useQuery({
    queryKey: ['school-info-transfers', schoolId],
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

  // Fetch payments status
  const { data: paymentMap = {} } = useQuery({
    queryKey: ['transfers-payments', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('student_id, status')
        .eq('school_id', schoolId);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((p: any) => {
        map[p.student_id] = p.status;
      });
      return map;
    },
  });

  // Update payment status mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ studentId, newStatus }: { studentId: string; newStatus: string }) => {
      const { data: existing } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('payments')
          .update({ status: newStatus })
          .eq('id', existing.id);
        if (error) throw error;
      }

      // When payment is confirmed as paid, enroll the student
      if (newStatus === 'paid') {
        const { error: studentError } = await supabase
          .from('students')
          .update({ status: 'enrolled' as const })
          .eq('id', studentId);
        if (studentError) throw studentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers-payments', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
    },
  });

  const getPaymentSelect = (studentId: string) => (
    <Select
      value={paymentMap[studentId] || 'unpaid'}
      onValueChange={(val) => updatePaymentMutation.mutate({ studentId, newStatus: val })}
    >
      <SelectTrigger className="w-[90px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unpaid">Unpaid</SelectItem>
        <SelectItem value="paid">Paid</SelectItem>
      </SelectContent>
    </Select>
  );

  const acceptMutation = useMutation({
    mutationFn: async ({ applicationId, studentId, classStream, grade }: { applicationId: string; studentId: string; classStream: string; grade: string }) => {
      const studentIdCode = generateStudentId();

      // Assign class/ID but keep student status as 'pending' until payment is confirmed
      const { error: studentError } = await supabase
        .from('students')
        .update({ status: 'pending', class_stream: classStream, current_grade: grade, student_id_code: studentIdCode, school_id: schoolId })
        .eq('id', studentId);
      if (studentError) throw studentError;

      // Mark application as approved — will become 'enrolled' after payment
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);
      if (appError) throw appError;

      return { studentIdCode };
    },
    onSuccess: (data) => {
      toast({
        title: t('school.transfers.acceptSuccess'),
        description: `${t('school.newApps.studentIdGenerated')}: ${data.studentIdCode}`,
      });
      if (selectedApp && user) {
        supabase.from('students').select('parent_id').eq('id', selectedApp.students.id).single()
          .then(async ({ data: s }) => {
            if (s) {
              const { createDocumentMarker } = await import('@/lib/document-access');
              const reqRefs = school?.requirements_pdf_url
                ? school.requirements_pdf_url.split(',').map((r: string) => r.trim()).filter(Boolean)
                : [];
              let msgContent = `🎉 Transfer approved!\n\n${selectedApp.students.name} (ID: ${data.studentIdCode}) has been enrolled in ${selectedGrade} Class ${selectedStream}.\n\nPlease proceed with payment of school fees.`;
              if (reqRefs.length > 0) {
                msgContent += `\n\n${createDocumentMarker('school-documents', 'View School Requirements', reqRefs)}`;
              }
              sendSystemMessage({ senderId: user.id, receiverId: s.parent_id, applicationId: selectedApp.id, content: msgContent });
            }
          });
      }
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      setAcceptDialog(false);
      setSelectedApp(null);
    },
    onError: (error: Error) => {
      toast({ title: t('school.approval.error'), description: error.message, variant: 'destructive' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase.from('applications')
        .update({ status: 'rejected', transfer_reason: reason })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: t('school.transfers.rejectSuccess'), description: t('school.newApps.rejectSuccessDesc') });
      if (selectedApp && user) {
        supabase.from('students').select('parent_id').eq('id', selectedApp.students.id).single()
          .then(({ data: s }) => {
            if (s) {
              sendSystemMessage({
                senderId: user.id,
                receiverId: s.parent_id,
                applicationId: selectedApp.id,
                content: `❌ Transfer for ${selectedApp.students.name} was rejected. Reason: ${rejectionReason}. Please check and re-upload documents.`,
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

  const handleAccept = () => {
    if (!selectedApp || !selectedGrade) return;
    acceptMutation.mutate({
      applicationId: selectedApp.id,
      studentId: selectedApp.students.id,
      classStream: selectedStream,
      grade: selectedGrade,
    });
  };

  const handleReject = () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    rejectMutation.mutate({ applicationId: selectedApp.id, reason: rejectionReason });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />{t('school.status.approved')}</Badge>;
      case 'enrolled':
        return <Badge className="bg-blue-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />{t('school.status.enrolled')}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white"><XCircle className="w-3 h-3 mr-1" />{t('school.status.rejected')}</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1" />{t('school.status.pending')}</Badge>;
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

  if (transferApplications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>{t('school.transfers.empty')}</p>
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
              <TableHead>{t('school.transfers.fromSchool')}</TableHead>
              <TableHead>{t('school.table.grade')}</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>{t('school.table.date')}</TableHead>
              <TableHead>{t('school.table.status')}</TableHead>
              <TableHead className="text-right">{t('school.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferApplications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{app.students.name}</p>
                    <p className="text-xs text-muted-foreground">DOB: {format(new Date(app.students.dob), 'MMM d, yyyy')}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{app.previous_school_name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>{app.students.current_grade || '-'}</TableCell>
                <TableCell>{getPaymentSelect(app.students.id)}</TableCell>
                <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedApp(app); setSelectedGrade(app.students.current_grade || ''); setDetailsDialog(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {app.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => { setSelectedApp(app); setSelectedGrade(app.students.current_grade || ''); setAcceptDialog(true); }}>
                          <CheckCircle className="w-4 h-4 mr-1" />{t('school.transfers.accept')}
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
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>{t('school.transfers.detailsTitle')}</DialogTitle>
                <DialogDescription>{t('school.transfers.verifyTransfer')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {selectedApp.students.student_id_code && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                      <p className="font-mono">{selectedApp.students.student_id_code}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <h4 className="font-medium text-sm">{t('school.details.parentContact')}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {selectedApp.students.mother_name && (
                      <div>
                        <span className="text-muted-foreground">{t('school.details.motherLabel')}</span>
                        <p className="font-medium">{selectedApp.students.mother_name}</p>
                        {selectedApp.students.mother_phone && <p className="text-xs">{selectedApp.students.mother_phone}</p>}
                      </div>
                    )}
                    {selectedApp.students.father_name && (
                      <div>
                        <span className="text-muted-foreground">{t('school.details.fatherLabel')}</span>
                        <p className="font-medium">{selectedApp.students.father_name}</p>
                        {selectedApp.students.father_phone && <p className="text-xs">{selectedApp.students.father_phone}</p>}
                      </div>
                    )}
                    {selectedApp.students.parent_email && (
                      <div>
                        <span className="text-muted-foreground">{t('school.details.emailLabel')}</span>
                        <p className="text-xs">{selectedApp.students.parent_email}</p>
                      </div>
                    )}
                    {selectedApp.students.parent_phone && (
                      <div>
                        <span className="text-muted-foreground">{t('school.details.phoneLabel')}</span>
                        <p className="text-xs">{selectedApp.students.parent_phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {t('school.details.transferInfo')}
                  </h4>
                  <p className="text-sm"><strong>{t('school.details.prevSchool')}:</strong> {selectedApp.previous_school_name}</p>
                  <p className="text-sm"><strong>{t('school.details.reason')}:</strong> {selectedApp.transfer_reason}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">{t('school.transfers.requiredDocs')}</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedApp.transcripts_url ? (
                      getTranscriptLinks(selectedApp.transcripts_url).map((ref, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => void openDocument(ref)}>
                          <FileText className="w-4 h-4 mr-1" />Transcript {i + 1}
                        </Button>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-destructive">
                        <AlertCircle className="w-3 h-3 mr-1" />{t('school.transfers.missingTranscripts')}
                      </Badge>
                    )}
                    {splitStoredReferences(selectedApp.proof_payment_url)[0] && (
                      <Button variant="outline" size="sm" onClick={() => void openDocument(splitStoredReferences(selectedApp.proof_payment_url)[0])}>
                        <CreditCard className="w-4 h-4 mr-1" />{t('school.details.viewPayment')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button variant="destructive" onClick={() => { setDetailsDialog(false); setRejectDialog(true); }}>
                      <XCircle className="w-4 h-4 mr-1" />{t('school.action.reject')}
                    </Button>
                    <Button onClick={() => { setDetailsDialog(false); setAcceptDialog(true); }}>
                      <CheckCircle className="w-4 h-4 mr-1" />{t('school.transfers.accept')}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acceptDialog} onOpenChange={setAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.transfers.acceptTitle')}</DialogTitle>
            <DialogDescription>{t('school.transfers.acceptDesc')} {selectedApp?.students.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.transfers.assignGrade')}</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger><SelectValue placeholder={t('school.transfers.selectGrade')} /></SelectTrigger>
                <SelectContent>
                  {grades.map((grade) => (<SelectItem key={grade} value={grade}>{grade}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t('school.approval.stream')}</label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {classStreams.map((stream) => (<SelectItem key={stream} value={stream}>{t('school.approval.class')} {stream}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleAccept} disabled={acceptMutation.isPending || !selectedGrade}>{t('school.transfers.confirmAccept')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.transfers.rejectTitle')}</DialogTitle>
            <DialogDescription>{t('school.newApps.rejectDesc')} {selectedApp?.students.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.newApps.rejectReasonLabel')}</label>
              <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder={t('school.newApps.rejectReasonPlaceholder')} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectionReason.trim()}>{t('school.transfers.confirmReject')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
