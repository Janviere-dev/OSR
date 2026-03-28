import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { openDocumentReference, splitStoredReferences } from '@/lib/document-access';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2,
  Users,
  ChevronDown,
  ChevronRight,
  Download,
  Trash2,
  FileText,
  Eye,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StudentManagementTabProps {
  schoolId: string;
}

interface Student {
  id: string;
  name: string;
  dob: string;
  current_grade: string | null;
  class_stream: string | null;
  status: 'pending' | 'passed' | 'repeat' | 'enrolled';
  student_id_code: string | null;
  mother_name: string | null;
  father_name: string | null;
  mother_phone: string | null;
  father_phone: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  parent_id: string;
}

const allGrades = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
];
const classStreams = ['A', 'B', 'C', 'D', 'E'];

export function StudentManagementTab({ schoolId }: StudentManagementTabProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [openGrades, setOpenGrades] = useState<Set<string>>(new Set());
  const [openStreams, setOpenStreams] = useState<Set<string>>(new Set());

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['school-students', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, dob, current_grade, class_stream, status, student_id_code, mother_name, father_name, mother_phone, father_phone, parent_phone, parent_email, parent_id')
        .eq('school_id', schoolId)
        .order('current_grade', { ascending: true })
        .order('class_stream', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch school name
  const { data: school } = useQuery({
    queryKey: ['school-name-mgmt', schoolId],
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

  // Fetch transcripts per student from their applications
  const { data: transcriptMap = {} } = useQuery({
    queryKey: ['student-transcripts-mgmt', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('student_id, transcripts_url')
        .eq('school_id', schoolId)
        .not('transcripts_url', 'is', null);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((a: any) => {
        if (!map[a.student_id] && a.transcripts_url) map[a.student_id] = a.transcripts_url;
      });
      return map;
    },
  });

  // Fetch payments status per student
  const { data: paymentMap = {} } = useQuery({
    queryKey: ['student-payments-mgmt', schoolId],
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-payments-mgmt', schoolId] });
    },
  });

  const getPaymentBadge = (studentId: string) => {
    const status = paymentMap[studentId];
    if (status === 'paid') {
      return <span className="text-green-700 font-semibold">Paid</span>;
    }
    return <span className="text-red-600 font-semibold">Unpaid</span>;
  };

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

  const getTranscriptLinks = (studentId: string) => {
    return splitStoredReferences(transcriptMap[studentId]);
  };

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

  // Clear class sheet - remove students from class and notify parents
  const handleClearSheet = async (grade: string, stream: string, sheetStudents: Student[]) => {
    if (!user) return;
    
    for (const student of sheetStudents) {
      await supabase
        .from('students')
        .update({ class_stream: null, current_grade: null, status: 'pending' as const })
        .eq('id', student.id);

      await supabase
        .from('applications')
        .update({ status: 'archived' })
        .eq('student_id', student.id)
        .eq('school_id', schoolId);

      await sendSystemMessage({
        senderId: user.id,
        receiverId: student.parent_id,
        content: `${t('rereg.polite').replace('Munezeo Janviere', student.name).replace('Secondary 2 Class A', `${grade} Class ${stream}`)}`,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['school-students'] });
    queryClient.invalidateQueries({ queryKey: ['gov-students'] });
    queryClient.invalidateQueries({ queryKey: ['school-applications'] });

    toast({
      title: 'Class cleared for new year',
      description: `${sheetStudents.length} student(s) cleared from ${grade} Class ${stream}. Parents have been notified to re-register.`,
    });
  };

  // Export class sheet as PDF (simple printable format)
  const handleExportSheet = (grade: string, stream: string, sheetStudents: Student[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = sheetStudents.map((s, i) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${i + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;font-family:monospace">${s.student_id_code || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;font-weight:500">${s.name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${stream}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${grade} Class ${stream} - Student List</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { text-align: center; color: #1a365d; margin-bottom: 5px; }
          h2 { text-align: center; color: #555; font-weight: normal; margin-top: 0; }
          .meta { text-align: center; color: #888; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #1a365d; color: white; padding: 10px 8px; border: 1px solid #1a365d; text-align: left; }
          tr:nth-child(even) { background: #f8f9fa; }
          .footer { text-align: center; margin-top: 30px; color: #888; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <h1>${school?.name || 'School'}</h1>
        <h2>${grade} — Class ${stream}</h2>
        <p class="meta">Total Students: ${sheetStudents.length} | Generated: ${format(new Date(), 'MMMM d, yyyy')}</p>
        <table>
          <thead>
            <tr>
              <th style="width:40px">#</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th style="width:80px">Class</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="footer">This document is generated from OSR Rwanda Platform</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();

    toast({ title: 'PDF Ready', description: `${grade} Class ${stream} class list opened for printing/saving as PDF.` });
  };

  const toggleGrade = (grade: string) => {
    setOpenGrades(prev => {
      const next = new Set(prev);
      next.has(grade) ? next.delete(grade) : next.add(grade);
      return next;
    });
  };

  const toggleStream = (key: string) => {
    setOpenStreams(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Group students: grade -> stream -> students
  const groupedData = React.useMemo(() => {
    const result: { grade: string; streams: { stream: string; students: Student[] }[] }[] = [];

    allGrades.forEach(grade => {
      const gradeStudents = students.filter(s => s.current_grade === grade);
      const streams: { stream: string; students: Student[] }[] = [];
      classStreams.forEach(stream => {
        const streamStudents = gradeStudents.filter(s => s.class_stream === stream);
        streams.push({ stream, students: streamStudents });
      });
      result.push({ grade, streams });
    });
    return result;
  }, [students]);

  const totalStudents = students.length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Single Total Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {t('school.students.total')}
          </CardDescription>
          <CardTitle className="text-3xl">{totalStudents}</CardTitle>
        </CardHeader>
      </Card>

      {/* Class Sheets */}
      <div className="space-y-3">
        {groupedData.map(({ grade, streams }) => {
          const isGradeOpen = openGrades.has(grade);
          const gradeTotal = streams.reduce((sum, s) => sum + s.students.length, 0);

          return (
            <Collapsible key={grade} open={isGradeOpen} onOpenChange={() => toggleGrade(grade)}>
              <Card className="overflow-hidden">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isGradeOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                        <div>
                          <CardTitle className="text-lg">{grade}</CardTitle>
                          <CardDescription>{gradeTotal} {gradeTotal === 1 ? t('school.students.studentSingular') : t('school.students.studentPlural')} · {streams.length} class(es)</CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-3">
                    {streams.map(({ stream, students: streamStudents }) => {
                      const streamKey = `${grade}-${stream}`;
                      const isStreamOpen = openStreams.has(streamKey);

                      return (
                        <Collapsible key={streamKey} open={isStreamOpen} onOpenChange={() => toggleStream(streamKey)}>
                          <div className="border rounded-lg">
                            <CollapsibleTrigger asChild>
                              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2">
                                  {isStreamOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  <span className="font-medium">Class {stream}</span>
                                  <Badge variant="secondary" className="text-foreground">{streamStudents.length} / 50</Badge>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  {streamStudents.length > 0 && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleExportSheet(grade, stream, streamStudents)}
                                      >
                                        <FileText className="w-4 h-4 mr-1" />
                                        Export PDF
                                      </Button>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="border-osr-warning bg-osr-warning/80 text-foreground hover:bg-osr-warning/90"
                                              onClick={() => handleClearSheet(grade, stream, streamStudents)}
                                            >
                                              <Trash2 className="w-4 h-4 mr-1" />
                                              Clear & Notify
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Clear this class for the new academic year and notify parents.</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t overflow-x-auto">
                                {streamStudents.length === 0 ? (
                                  <div className="p-4 text-center text-muted-foreground text-sm">
                                    No students in this class yet
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                    <TableRow>
                                      <TableHead>#</TableHead>
                                      <TableHead>{t('school.students.studentId')}</TableHead>
                                      <TableHead>{t('school.table.student')}</TableHead>
                                      <TableHead>Payment</TableHead>
                                      <TableHead>Documents</TableHead>
                                      <TableHead>{t('school.students.class')}</TableHead>
                                    </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {streamStudents.map((student, idx) => (
                                        <TableRow key={student.id}>
                                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                          <TableCell>
                                            <span className="font-mono text-sm">{student.student_id_code || '-'}</span>
                                          </TableCell>
                                          <TableCell>
                                            <div>
                                              <p className="font-medium">{student.name}</p>
                                            </div>
                                          </TableCell>
                                          <TableCell>{getPaymentSelect(student.id)}</TableCell>
                                          <TableCell>
                                            {getTranscriptLinks(student.id).length > 0 ? (
                                              <div className="flex gap-1">
                                                {getTranscriptLinks(student.id).map((ref, i) => (
                                                  <Button
                                                    key={i}
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDocument(ref)}
                                                    title={`View transcript ${i + 1}`}
                                                  >
                                                    <Eye className="w-4 h-4" />
                                                  </Button>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                          </TableCell>
                                          <TableCell>{stream}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
