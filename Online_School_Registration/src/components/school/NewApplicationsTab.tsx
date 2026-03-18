import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  FileText, 
  CreditCard,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

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

interface NewApplicationsTabProps {
  applications: ApplicationWithDetails[];
  schoolId: string;
}

const classStreams = ['A', 'B', 'C', 'D', 'E'];
// Generate unique student ID
const generateStudentId = (): string => {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `STU${year}${random}`;
};

const parseTranscriptUrls = (value: string | null): string[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // fallback for old string values
  }

  if (value.includes(',')) {
    return value.split(',').map((url) => url.trim()).filter(Boolean);
  }

  return [value];
};

const extractStudentDocumentPath = (value: string): string => {
  const publicMarker = '/storage/v1/object/public/student-documents/';
  const signedMarker = '/storage/v1/object/sign/student-documents/';

  if (value.includes(publicMarker)) {
    return decodeURIComponent(value.split(publicMarker)[1].split('?')[0]);
  }

  if (value.includes(signedMarker)) {
    return decodeURIComponent(value.split(signedMarker)[1].split('?')[0]);
  }

  return value;
};

export function NewApplicationsTab({ applications, schoolId }: NewApplicationsTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const openTranscript = async (fileReference: string) => {
    const path = extractStudentDocumentPath(fileReference);

    if (!path || path.startsWith('http')) {
      window.open(fileReference, '_blank', 'noopener,noreferrer');
      return;
    }

    const { data, error } = await supabase.storage
      .from('student-documents')
      .createSignedUrl(path, 60 * 15);

    if (error || !data?.signedUrl) {
      toast({
        title: t('school.approval.error'),
        description: error?.message || 'Unable to open transcript file. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };
  
  const [selectedApp, setSelectedApp] = useState<ApplicationWithDetails | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [selectedStream, setSelectedStream] = useState('A');
  const [rejectionReason, setRejectionReason] = useState('');

  const newApplications = applications.filter(app => app.type === 'new');

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ applicationId, studentId, classStream, grade }: {
      applicationId: string;
      studentId: string;
      classStream: string;
      grade: string;
    }) => {
      const studentIdCode = generateStudentId();
      
      // Update student with school assignment and ID
      const { error: studentError } = await supabase
        .from('students')
        .update({
          status: 'pending',
          class_stream: classStream,
          current_grade: grade,
          student_id_code: studentIdCode,
          school_id: schoolId,
        })
        .eq('id', studentId);

      if (studentError) throw studentError;

      // Update application status
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'approved' })
        .eq('id', applicationId);

      if (appError) throw appError;

      return { studentIdCode };
    },
    onSuccess: (data) => {
      toast({
        title: t('school.newApps.approveSuccess'),
        description: `${t('school.newApps.studentIdGenerated')}: ${data.studentIdCode}`,
      });
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      setApprovalDialog(false);
      setSelectedApp(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('school.approval.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: 'rejected',
          transfer_reason: reason // Reusing this field for rejection reason
        })
        .eq('id', applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('school.newApps.rejectSuccess'),
        description: t('school.newApps.rejectSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['school-applications'] });
      setRejectDialog(false);
      setSelectedApp(null);
      setRejectionReason('');
    },
    onError: (error: Error) => {
      toast({
        title: t('school.approval.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleApprove = () => {
    if (!selectedApp) return;
    approveMutation.mutate({
      applicationId: selectedApp.id,
      studentId: selectedApp.students.id,
      classStream: selectedStream,
      grade: selectedApp.students.current_grade || 'Nursery 1',
    });
  };

  const handleReject = () => {
    if (!selectedApp || !rejectionReason.trim()) return;
    rejectMutation.mutate({
      applicationId: selectedApp.id,
      reason: rejectionReason,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="font-semibold border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('school.status.approved')}
          </Badge>
        );
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{t('school.status.rejected')}</Badge>;
      default:
        return (
          <Badge
            variant="outline"
            className="font-semibold border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200"
          >
            <Clock className="w-3 h-3 mr-1" />
            {t('school.status.pending')}
          </Badge>
        );
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
                    <p className="text-xs text-muted-foreground">
                      DOB: {format(new Date(app.students.dob), 'MMM d, yyyy')}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{app.students.current_grade || '-'}</TableCell>
                <TableCell>{format(new Date(app.created_at), 'MMM d, yyyy')}</TableCell>
                <TableCell>
                  {app.momo_id ? (
                    <Badge variant="outline" className="text-secondary border-secondary">
                      <CreditCard className="w-3 h-3 mr-1" />
                      {t('school.payment.paid')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t('school.payment.unpaid')}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(app.status)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedApp(app);
                        setDetailsDialog(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {app.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setApprovalDialog(true);
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('school.action.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedApp(app);
                            setRejectDialog(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {t('school.action.reject')}
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

      {/* Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-2xl">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle>{t('school.details.title')}</DialogTitle>
                <DialogDescription>{t('school.newApps.verifyDocs')}</DialogDescription>
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
                  {selectedApp.students.mother_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('school.details.mother')}</label>
                      <p>{selectedApp.students.mother_name}</p>
                    </div>
                  )}
                  {selectedApp.students.father_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">{t('school.details.father')}</label>
                      <p>{selectedApp.students.father_name}</p>
                    </div>
                  )}
                </div>

                {/* Documents Section */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h4 className="font-medium">{t('school.newApps.documents')}</h4>
                  <div className="flex gap-4">
                    {parseTranscriptUrls(selectedApp.transcripts_url).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {parseTranscriptUrls(selectedApp.transcripts_url).map((url, index) => (
                          <Button key={`${url}-${index}`} variant="outline" onClick={() => void openTranscript(url)}>
                              <FileText className="w-4 h-4 mr-2" />
                              View Transcript {index + 1}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('school.newApps.noTranscripts')}</p>
                    )}
                    {selectedApp.proof_payment_url ? (
                      <Button variant="outline" asChild>
                        <a href={selectedApp.proof_payment_url} target="_blank" rel="noopener noreferrer">
                          <CreditCard className="w-4 h-4 mr-2" />
                          {t('school.details.viewPayment')}
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('school.newApps.noPayment')}</p>
                    )}
                  </div>
                </div>

                {selectedApp.momo_id && (
                  <div className="p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                    <p className="text-sm text-secondary-foreground">
                      <strong>MoMo ID:</strong> {selectedApp.momo_id}
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        setDetailsDialog(false);
                        setRejectDialog(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {t('school.action.reject')}
                    </Button>
                    <Button 
                      onClick={() => {
                        setDetailsDialog(false);
                        setApprovalDialog(true);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {t('school.action.approve')}
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog} onOpenChange={setApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.newApps.approveTitle')}</DialogTitle>
            <DialogDescription>
              {t('school.newApps.approveDesc')} {selectedApp?.students.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.approval.stream')}</label>
              <Select value={selectedStream} onValueChange={setSelectedStream}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classStreams.map((stream) => (
                    <SelectItem key={stream} value={stream}>
                      {selectedApp?.students.current_grade || 'Nursery 1'} - {t('school.approval.class')} {stream}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {t('school.newApps.idWillGenerate')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {t('school.approval.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.newApps.rejectTitle')}</DialogTitle>
            <DialogDescription>
              {t('school.newApps.rejectDesc')} {selectedApp?.students.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('school.newApps.rejectionReason')}</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t('school.newApps.rejectionPlaceholder')}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('school.newApps.rejectionHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {t('school.newApps.confirmReject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
