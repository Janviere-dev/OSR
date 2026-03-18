import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2,
  CheckCircle, 
  RotateCcw,
  AlertCircle,
  Users,
  GraduationCap,
  ClipboardCheck,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

interface StudentManagementTabProps {
  schoolId: string;
}

interface Student {
  id: string;
  name: string;
  dob: string;
  current_grade: string | null;
  class_stream: string | null;
  status: 'pending' | 'passed' | 'repeat';
  student_id_code: string | null;
  mother_name: string | null;
  father_name: string | null;
}

const gradeOrder = [
  'Nursery 1', 'Nursery 2', 'Nursery 3', 
  'Primary 1', 'Primary 2', 'Primary 3', 
  'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3',
  'Secondary 4', 'Secondary 5', 'Secondary 6'
];

export function StudentManagementTab({ schoolId }: StudentManagementTabProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [processDialog, setProcessDialog] = useState(false);
  const [openGrades, setOpenGrades] = useState<Set<string>>(new Set());

  // Fetch students for this school
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['school-students', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('current_grade', { ascending: true })
        .order('class_stream', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Student[];
    },
  });

  // Process results mutation
  const processResultsMutation = useMutation({
    mutationFn: async ({ studentId, newStatus }: { studentId: string; newStatus: 'passed' | 'repeat' }) => {
      const { error } = await supabase
        .from('students')
        .update({ status: newStatus })
        .eq('id', studentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('school.students.resultProcessed'),
        description: t('school.students.resultProcessedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['school-students'] });
      setProcessDialog(false);
      setSelectedStudent(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('school.approval.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleProcessResult = (status: 'passed' | 'repeat') => {
    if (!selectedStudent) return;
    processResultsMutation.mutate({
      studentId: selectedStudent.id,
      newStatus: status,
    });
  };

  const toggleGrade = (grade: string) => {
    setOpenGrades(prev => {
      const next = new Set(prev);
      if (next.has(grade)) {
        next.delete(grade);
      } else {
        next.add(grade);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (openGrades.size === groupedStudents.length) {
      setOpenGrades(new Set());
    } else {
      setOpenGrades(new Set(groupedStudents.map(g => g.grade)));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return (
          <Badge className="font-semibold border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {t('hub.status.passed')}
          </Badge>
        );
      case 'repeat':
        return <Badge variant="destructive"><RotateCcw className="w-3 h-3 mr-1" />{t('hub.status.repeat')}</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />{t('hub.status.pending')}</Badge>;
    }
  };

  // Group students by grade
  const groupedStudents = React.useMemo(() => {
    const groups: { grade: string; students: Student[] }[] = [];
    const gradeMap = new Map<string, Student[]>();

    students.forEach(s => {
      const grade = s.current_grade || t('school.students.unassigned');
      if (!gradeMap.has(grade)) gradeMap.set(grade, []);
      gradeMap.get(grade)!.push(s);
    });

    // Sort by predefined grade order
    const sorted = [...gradeMap.entries()].sort(([a], [b]) => {
      const idxA = gradeOrder.indexOf(a);
      const idxB = gradeOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return a.localeCompare(b);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    sorted.forEach(([grade, studs]) => groups.push({ grade, students: studs }));
    return groups;
  }, [students, t]);

  // Stats
  const totalStudents = students.length;
  const passedCount = students.filter(s => s.status === 'passed').length;
  const repeatCount = students.filter(s => s.status === 'repeat').length;
  const pendingCount = students.filter(s => s.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {t('school.students.total')}
            </CardDescription>
            <CardTitle className="text-3xl">{totalStudents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <GraduationCap className="w-4 h-4" />
              {t('school.students.passed')}
            </CardDescription>
            <CardTitle className="text-3xl text-secondary">{passedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <RotateCcw className="w-4 h-4" />
              {t('school.students.repeat')}
            </CardDescription>
            <CardTitle className="text-3xl text-destructive">{repeatCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ClipboardCheck className="w-4 h-4" />
              {t('school.students.pending')}
            </CardDescription>
            <CardTitle className="text-3xl text-accent-foreground">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Grouped by Grade */}
      {groupedStudents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t('school.students.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={toggleAll}>
              {openGrades.size === groupedStudents.length ? t('school.students.collapseAll') : t('school.students.expandAll')}
            </Button>
          </div>

          {groupedStudents.map(({ grade, students: gradeStudents }) => {
            const isOpen = openGrades.has(grade);
            const gradePassed = gradeStudents.filter(s => s.status === 'passed').length;
            const gradeRepeat = gradeStudents.filter(s => s.status === 'repeat').length;
            const gradePending = gradeStudents.filter(s => s.status === 'pending').length;

            return (
              <Collapsible key={grade} open={isOpen} onOpenChange={() => toggleGrade(grade)}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                          <div>
                            <CardTitle className="text-lg">{grade}</CardTitle>
                            <CardDescription className="mt-0.5">
                              {gradeStudents.length} {gradeStudents.length === 1 ? t('school.students.studentSingular') : t('school.students.studentPlural')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {gradePassed > 0 && (
                              <Badge className="font-semibold border border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                                {gradePassed} {t('hub.status.passed')}
                              </Badge>
                          )}
                          {gradeRepeat > 0 && (
                            <Badge variant="destructive">{gradeRepeat} {t('hub.status.repeat')}</Badge>
                          )}
                          {gradePending > 0 && (
                            <Badge variant="outline">{gradePending} {t('hub.status.pending')}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t('school.students.studentId')}</TableHead>
                              <TableHead>{t('school.table.student')}</TableHead>
                              <TableHead>{t('school.students.class')}</TableHead>
                              <TableHead>{t('school.table.status')}</TableHead>
                              <TableHead className="text-right">{t('school.table.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gradeStudents.map((student) => (
                              <TableRow key={student.id}>
                                <TableCell>
                                  <span className="font-mono text-sm">{student.student_id_code || '-'}</span>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      DOB: {format(new Date(student.dob), 'MMM d, yyyy')}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {student.class_stream ? `${t('school.approval.class')} ${student.class_stream}` : '-'}
                                </TableCell>
                                <TableCell>{getStatusBadge(student.status)}</TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setProcessDialog(true);
                                    }}
                                  >
                                    <ClipboardCheck className="w-4 h-4 mr-1" />
                                    {t('school.students.processResults')}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Process Results Dialog */}
      <Dialog open={processDialog} onOpenChange={setProcessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('school.students.processResultsTitle')}</DialogTitle>
            <DialogDescription>
              {t('school.students.processResultsDesc')} {selectedStudent?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('school.students.currentGrade')}:</span>
                    <span className="ml-2 font-medium">{selectedStudent.current_grade}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('school.students.class')}:</span>
                    <span className="ml-2 font-medium">{selectedStudent.class_stream}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('school.students.currentStatus')}:</span>
                    <span className="ml-2">{getStatusBadge(selectedStudent.status)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  className="h-24 flex-col gap-2"
                  variant={selectedStudent.status === 'passed' ? 'default' : 'outline'}
                  onClick={() => handleProcessResult('passed')}
                  disabled={processResultsMutation.isPending}
                >
                  <CheckCircle className="w-8 h-8" />
                  <span>{t('school.students.markPassed')}</span>
                  <span className="text-xs opacity-70">{t('school.students.passedNote')}</span>
                </Button>
                <Button
                  size="lg"
                  className="h-24 flex-col gap-2"
                  variant={selectedStudent.status === 'repeat' ? 'destructive' : 'outline'}
                  onClick={() => handleProcessResult('repeat')}
                  disabled={processResultsMutation.isPending}
                >
                  <RotateCcw className="w-8 h-8" />
                  <span>{t('school.students.markRepeat')}</span>
                  <span className="text-xs opacity-70">{t('school.students.repeatNote')}</span>
                </Button>
              </div>

              <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm text-accent-foreground">
                  <strong>{t('school.students.note')}:</strong> {t('school.students.newYearNote')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
