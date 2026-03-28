import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import govLogo from '@/assets/gov-logo.png';
import * as XLSX from 'xlsx';
import { splitStoredReferences, getAccessibleDocumentUrl, openDocumentReference } from '@/lib/document-access';

const allGrades = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
];
const classStreams = ['A', 'B', 'C', 'D', 'E'];

interface Student {
  id: string;
  name: string;
  dob: string;
  student_id_code: string | null;
  current_grade: string | null;
  class_stream: string | null;
  mother_name: string | null;
  father_name: string | null;
  mother_phone: string | null;
  father_phone: string | null;
  parent_phone: string | null;
  parent_email: string | null;
  status: string;
}

interface Application {
  student_id: string;
  transcripts_url: string | null;
}

const SchoolGovernment = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [openClasses, setOpenClasses] = useState<Set<string>>(new Set());

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

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['gov-students', school?.id],
    queryFn: async () => {
      if (!school) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, name, dob, student_id_code, current_grade, class_stream, mother_name, father_name, mother_phone, father_phone, parent_phone, parent_email, status')
        .eq('school_id', school.id)
        .order('name');
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!school,
  });

  const { data: applications = [] } = useQuery({
    queryKey: ['gov-applications', school?.id],
    queryFn: async () => {
      if (!school) return [];
      const { data, error } = await supabase
        .from('applications')
        .select('student_id, transcripts_url')
        .eq('school_id', school.id);
      if (error) throw error;
      return data as Application[];
    },
    enabled: !!school,
  });

  const transcriptMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    applications.forEach(app => {
      if (app.transcripts_url) {
        map[app.student_id] = splitStoredReferences(app.transcripts_url);
      }
    });
    return map;
  }, [applications]);

  const groupedData = useMemo(() => {
    const result: { grade: string; streams: { stream: string; students: Student[] }[] }[] = [];
    allGrades.forEach(grade => {
      const gradeStudents = students.filter(s => s.current_grade === grade);
      if (gradeStudents.length === 0) return;
      const streams: { stream: string; students: Student[] }[] = [];
      classStreams.forEach(stream => {
        const streamStudents = gradeStudents.filter(s => s.class_stream === stream);
        if (streamStudents.length > 0) {
          streams.push({ stream, students: streamStudents });
        }
      });
      const unassigned = gradeStudents.filter(s => !s.class_stream || !classStreams.includes(s.class_stream));
      if (unassigned.length > 0) {
        streams.push({ stream: '-', students: unassigned });
      }
      if (streams.length > 0) {
        result.push({ grade, streams });
      }
    });
    return result;
  }, [students]);

  const toggleClass = (key: string) => {
    setOpenClasses(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const exportClassToExcel = async (grade: string, stream: string, classStudents: Student[]) => {
    // Generate signed URLs for all transcripts first
    const headers = ['Student ID', 'Name', 'Date of Birth', 'Mother Name', 'Mother Phone', 'Father Name', 'Father Phone', 'Email', 'Grade'];
    
    // Find max transcript count
    let maxTranscripts = 0;
    classStudents.forEach(s => {
      const refs = transcriptMap[s.id] || [];
      if (refs.length > maxTranscripts) maxTranscripts = refs.length;
    });
    for (let i = 0; i < Math.max(maxTranscripts, 1); i++) {
      headers.push(`Transcript ${i + 1}`);
    }

    const rows: string[][] = [];
    for (const s of classStudents) {
      const refs = transcriptMap[s.id] || [];
      const urls: string[] = [];
      for (const ref of refs) {
        try {
          const url = await getAccessibleDocumentUrl(ref, 'student-documents');
          urls.push(url);
        } catch {
          urls.push('');
        }
      }
      rows.push([
        s.student_id_code || '',
        s.name,
        format(new Date(s.dob), 'yyyy-MM-dd'),
        s.mother_name || '',
        s.mother_phone || s.parent_phone || '',
        s.father_name || '',
        s.father_phone || '',
        s.parent_email || '',
        s.current_grade || '',
        ...urls,
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((_, i) => ({ wch: Math.max(headers[i].length, ...rows.map(r => String(r[i] || '').length)) + 2 }));
    
    // Make transcript cells into hyperlinks
    const headerCount = 9; // columns before transcripts
    rows.forEach((row, ri) => {
      for (let ti = headerCount; ti < row.length; ti++) {
        if (row[ti]) {
          const cellRef = XLSX.utils.encode_cell({ r: ri + 1, c: ti });
          if (ws[cellRef]) {
            ws[cellRef].l = { Target: row[ti], Tooltip: `Transcript ${ti - headerCount + 1}` };
            ws[cellRef].v = `View Transcript ${ti - headerCount + 1}`;
          }
        }
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${grade} ${stream}`);
    XLSX.writeFile(wb, `${grade}_Class_${stream}_students.xlsx`);
    toast({ title: t('gov.exportComplete'), description: `${grade} ${t('gov.class')} ${stream} ${t('gov.exported')}` });
  };

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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(200,80%,45%)] via-[hsl(200,80%,50%)] to-[hsl(200,80%,55%)] p-6 text-white shadow-xl">
              <div className="flex items-center gap-4">
                <img src={govLogo} alt="Ministry of Education" className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1" />
                <div>
                  <h1 className="text-2xl lg:text-3xl font-display font-bold">{t('school.welcome.govPortal')}</h1>
                  <p className="opacity-80">{t('school.welcome.govPortalDesc')}</p>
                  <p className="text-sm opacity-60 mt-1">{t('gov.republic')}</p>
                </div>
              </div>
            </div>

            {studentsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : groupedData.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <p className="text-muted-foreground">{t('school.students.empty')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groupedData.map(({ grade, streams }) => (
                  <Card key={grade} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-3">
                      <CardTitle className="text-lg">{grade}</CardTitle>
                      <CardDescription>
                        {streams.reduce((sum, s) => sum + s.students.length, 0)} {t('gov.studentsAcross')} {streams.length} {t('gov.classes')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {streams.map(({ stream, students: classStudents }) => {
                        const key = `${grade}-${stream}`;
                        const isOpen = openClasses.has(key);
                        return (
                          <Collapsible key={key} open={isOpen} onOpenChange={() => toggleClass(key)}>
                            <div className="border rounded-lg">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                                  <div className="flex items-center gap-2">
                                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <span className="font-medium">{t('gov.class')} {stream}</span>
                                    <Badge variant="secondary" className="text-foreground">{classStudents.length}</Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportClassToExcel(grade, stream, classStudents);
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    {t('gov.exportExcel')}
                                  </Button>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="border-t overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                     <TableHead>{t('gov.studentId')}</TableHead>
                                        <TableHead>{t('gov.name')}</TableHead>
                                        <TableHead>{t('gov.dob')}</TableHead>
                                        <TableHead>{t('gov.mother')}</TableHead>
                                        <TableHead>{t('gov.motherPhone')}</TableHead>
                                        <TableHead>{t('gov.father')}</TableHead>
                                        <TableHead>{t('gov.fatherPhone')}</TableHead>
                                        <TableHead>{t('gov.email')}</TableHead>
                                        <TableHead>{t('gov.transcripts')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {classStudents.map(s => (
                                        <TableRow key={s.id}>
                                          <TableCell className="font-mono text-sm">{s.student_id_code || '-'}</TableCell>
                                          <TableCell className="font-medium">{s.name}</TableCell>
                                          <TableCell>{format(new Date(s.dob), 'MMM d, yyyy')}</TableCell>
                                          <TableCell className="text-sm">{s.mother_name || '-'}</TableCell>
                                          <TableCell className="text-sm">{s.mother_phone || s.parent_phone || '-'}</TableCell>
                                          <TableCell className="text-sm">{s.father_name || '-'}</TableCell>
                                          <TableCell className="text-sm">{s.father_phone || '-'}</TableCell>
                                          <TableCell className="text-sm">{s.parent_email || '-'}</TableCell>
                                          <TableCell>
                                            {transcriptMap[s.id]?.length ? (
                                              <div className="flex gap-1 flex-wrap">
                                                {transcriptMap[s.id].map((ref, i) => (
                                                  <Button
                                                    key={i}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={async () => {
                                                      try {
                                                        await openDocumentReference(ref, 'student-documents');
                                                      } catch (err) {
                                                        console.error('Transcript open error:', err, 'ref:', ref);
                                                        toast({ title: t('gov.transcriptError') || 'Could not open transcript', variant: 'destructive' });
                                                      }
                                                    }}
                                                  >
                                                    <ExternalLink className="w-3 h-3 mr-1" />
                                                    Doc {i + 1}
                                                  </Button>
                                                ))}
                                              </div>
                                            ) : '-'}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        );
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolGovernment;