import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Download, ChevronDown, ChevronRight, ExternalLink, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import govLogo from '@/assets/gov-logo.png';
import * as XLSX from 'xlsx';
import { splitStoredReferences, openDocumentReference, getAccessibleDocumentUrl } from '@/lib/document-access';

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

  const resolveTranscriptLinks = async (studentList: Student[], tMap: Record<string, string[]>) => {
    const resolved: Record<string, string | null> = {};
    await Promise.all(studentList.map(async (s) => {
      const refs = tMap[s.id] ?? [];
      if (refs.length === 0) { resolved[s.id] = null; return; }
      try {
        resolved[s.id] = await getAccessibleDocumentUrl(refs[0], 'student-documents');
      } catch {
        resolved[s.id] = null;
      }
    }));
    return resolved;
  };

  const buildClassSheet = async (_grade: string, stream: string, classStudents: Student[], tMap?: Record<string, string[]>) => {
    const headers = [
      'Student ID', 'Full Name', 'Date of Birth', 'Grade', 'Class',
      'Mother Name', 'Mother Phone', 'Father Name', 'Father Phone',
      'Parent Email', 'Enrollment Status', 'Transcripts',
    ];
    const TRANSCRIPT_COL = headers.length - 1; // index 11

    const map = tMap ?? transcriptMap;
    const resolvedUrls = await resolveTranscriptLinks(classStudents, map);

    const rows: (string | number)[][] = classStudents.map(s => {
      const refs = map[s.id] ?? [];
      const transcriptLabel = refs.length === 0 ? ''
        : refs.length === 1 ? 'View Transcript'
        : refs.map((_, i) => `Transcript ${i + 1}`).join('\n');
      return [
        s.student_id_code || '',
        s.name,
        format(new Date(s.dob), 'yyyy-MM-dd'),
        s.current_grade || '',
        stream === '-' ? '' : stream,
        s.mother_name || '',
        s.mother_phone || s.parent_phone || '',
        s.father_name || '',
        s.father_phone || '',
        s.parent_email || '',
        s.status || '',
        transcriptLabel,
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Embed hyperlinks + wrap text on the Transcripts column
    classStudents.forEach((s, rowIdx) => {
      const url = resolvedUrls[s.id];
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: TRANSCRIPT_COL });
      if (ws[cellRef]) {
        if (url) ws[cellRef].l = { Target: url, Tooltip: 'Click to open transcript' };
        ws[cellRef].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    });

    // Column widths — transcript col fixed wider for readability
    ws['!cols'] = headers.map((h, i) => ({
      wch: i === TRANSCRIPT_COL ? 20 : Math.max(h.length, ...rows.map(r => String(r[i] || '').length), 12) + 2,
    }));

    // Bold header row
    for (let c = 0; c < headers.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (ws[ref]) ws[ref].s = { font: { bold: true } };
    }

    return ws;
  };

  const exportAllToSDMS = async () => {
    if (groupedData.length === 0) return;
    toast({ title: 'Preparing SDMS export…', description: 'Building all class sheets.' });

    const wb = XLSX.utils.book_new();

    // Summary sheet — all students across all classes
    const summaryHeaders = [
      'Student ID', 'Full Name', 'Date of Birth', 'Grade', 'Class',
      'Mother Name', 'Mother Phone', 'Father Name', 'Father Phone',
      'Parent Email', 'Enrollment Status', 'Transcripts',
    ];
    const SUMMARY_TRANSCRIPT_COL = summaryHeaders.length - 1;

    const sortedStudents = students
      .filter(s => s.student_id_code)
      .sort((a, b) => {
        const gradeOrder = allGrades.indexOf(a.current_grade || '') - allGrades.indexOf(b.current_grade || '');
        if (gradeOrder !== 0) return gradeOrder;
        return (a.class_stream || '').localeCompare(b.class_stream || '');
      });

    const summaryResolvedUrls = await resolveTranscriptLinks(sortedStudents, transcriptMap);

    const summaryRows: (string | number)[][] = sortedStudents.map(s => {
      const refs = transcriptMap[s.id] ?? [];
      return [
        s.student_id_code || '',
        s.name,
        format(new Date(s.dob), 'yyyy-MM-dd'),
        s.current_grade || '',
        s.class_stream || '',
        s.mother_name || '',
        s.mother_phone || s.parent_phone || '',
        s.father_name || '',
        s.father_phone || '',
        s.parent_email || '',
        s.status || '',
        refs.length === 0 ? ''
          : refs.length === 1 ? 'View Transcript'
          : refs.map((_, i) => `Transcript ${i + 1}`).join('\n'),
      ];
    });

    const summaryWs = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryRows]);

    // Embed hyperlinks + wrap text on Transcripts column in summary sheet
    sortedStudents.forEach((s, rowIdx) => {
      const url = summaryResolvedUrls[s.id];
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: SUMMARY_TRANSCRIPT_COL });
      if (summaryWs[cellRef]) {
        if (url) summaryWs[cellRef].l = { Target: url, Tooltip: 'Click to open transcript' };
        summaryWs[cellRef].s = { alignment: { wrapText: true, vertical: 'top' } };
      }
    });

    summaryWs['!cols'] = summaryHeaders.map((h, i) => ({
      wch: i === SUMMARY_TRANSCRIPT_COL ? 20 : Math.max(h.length, ...summaryRows.map(r => String(r[i] || '').length), 12) + 2,
    }));
    // Bold header
    for (let c = 0; c < summaryHeaders.length; c++) {
      const ref = XLSX.utils.encode_cell({ r: 0, c });
      if (summaryWs[ref]) summaryWs[ref].s = { font: { bold: true } };
    }
    XLSX.utils.book_append_sheet(wb, summaryWs, 'All Students');

    // One sheet per class (grade + stream)
    for (const { grade, streams } of groupedData) {
      for (const { stream, students: classStudents } of streams) {
        if (classStudents.length === 0) continue;
        const ws = await buildClassSheet(grade, stream, classStudents);
        const sheetName = `${grade.replace('Primary ', 'P').replace('Secondary ', 'S')} ${stream}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    }

    const fileName = `${school?.name || 'School'}_SDMS_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast({
      title: 'SDMS Export Complete',
      description: `${fileName} — ${students.length} students across ${groupedData.reduce((n, g) => n + g.streams.length, 0)} classes.`,
    });
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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 text-primary-foreground shadow-xl">
              <div className="flex items-center gap-4">
                <img src={govLogo} alt="Ministry of Education" className="w-16 h-16 object-contain rounded-lg bg-white/10 p-1" />
                <div>
                  <h1 className="text-2xl lg:text-3xl font-display font-bold">{t('school.welcome.govPortal')}</h1>
                  <p className="opacity-80">{t('school.welcome.govPortalDesc')}</p>
                  <p className="text-sm opacity-60 mt-1">{t('gov.republic')}</p>
                </div>
              </div>
            </div>

            {/* SDMS export button */}
            {!studentsLoading && groupedData.length > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">SDMS Report — {school.name}</p>
                  <p className="text-sm text-muted-foreground">{students.length} enrolled students · ready for School Data Management System</p>
                </div>
                <Button onClick={exportAllToSDMS} className="gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Full SDMS Report
                </Button>
              </div>
            )}

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
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const ws = await buildClassSheet(grade, stream, classStudents);
                                      const wb = XLSX.utils.book_new();
                                      const sheetName = `${grade.replace('Primary ', 'P').replace('Secondary ', 'S')} ${stream}`.slice(0, 31);
                                      XLSX.utils.book_append_sheet(wb, ws, sheetName);
                                      XLSX.writeFile(wb, `${grade}_Class_${stream}_SDMS.xlsx`);
                                      toast({ title: 'Class exported', description: `${grade} Class ${stream}` });
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export Class
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