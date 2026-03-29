import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, User, Calendar, School, RefreshCw, Loader2, Upload, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface StudentHubProps {
  onBack: () => void;
}

const allGrades = [
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
  'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
];

const StudentHub = ({ onBack }: StudentHubProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Re-registration form state
  const [showReregister, setShowReregister] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [levelType, setLevelType] = useState('');
  const [previousClass, setPreviousClass] = useState('');
  const [newClass, setNewClass] = useState('');
  const [reregTranscripts, setReregTranscripts] = useState<File[]>([]);

  const { data: myStudents = [], isLoading } = useQuery({
    queryKey: ['my-students-full', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          schools(name, district, sector)
        `)
        .eq('parent_id', user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Only show accepted students (those with student_id_code)
  const acceptedStudents = myStudents.filter((s: any) => s.student_id_code);

  const handleSearch = async () => {
    if (!searchId.trim() || !user) return;
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`*, schools(name, district, sector)`)
        .eq('parent_id', user.id)
        .eq('student_id_code', searchId.trim())
        .single();

      if (error) {
        setSearchedStudent(null);
        toast({ title: t('hub.notFound'), description: t('hub.notFoundDesc'), variant: 'destructive' });
      } else {
        setSearchedStudent(data);
      }
    } catch {
      setSearchedStudent(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-register mutation
  const reRegisterMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedStudentId) throw new Error('Missing data');
      const student = myStudents.find((s: any) => s.id === selectedStudentId);
      if (!student || !student.school_id) throw new Error('Student or school not found');

      let transcriptsUrl = null;
      if (reregTranscripts.length > 0) {
        const uploadedRefs: string[] = [];
        for (const file of reregTranscripts) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          uploadedRefs.push(fileName);
        }
        transcriptsUrl = uploadedRefs.join(',');
      }

      const { error } = await supabase
        .from('applications')
        .insert({
          student_id: selectedStudentId,
          school_id: student.school_id,
          type: 'new',
          status: 'pending',
          transcripts_url: transcriptsUrl,
          previous_school_name: previousClass ? `Re-registration from ${previousClass}` : null,
          transfer_reason: newClass ? `Moving to ${newClass}` : null,
        });

      if (error) throw error;

      // Reset payment to unpaid so admin must mark paid for the new year
      await supabase
        .from('payments')
        .update({ status: 'unpaid' })
        .eq('student_id', selectedStudentId)
        .eq('school_id', student.school_id);
    },
    onSuccess: () => {
      toast({ title: t('hub.reregisterSuccess'), description: t('hub.reregisterSuccessDesc') });
      queryClient.invalidateQueries({ queryKey: ['my-students-full'] });
      setShowReregister(false);
      setSelectedStudentId('');
      setLevelType('');
      setPreviousClass('');
      setNewClass('');
      setReregTranscripts([]);
    },
    onError: (error: any) => {
      toast({ title: t('hub.reregisterError'), description: error.message, variant: 'destructive' });
    },
  });

  const handleReregFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReregTranscripts(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeReregFile = (index: number) => {
    setReregTranscripts(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge className="bg-blue-600 text-white">{t('hub.enrolled')}</Badge>;
      case 'passed':
        return <Badge className="bg-green-600 text-white">{t('hub.status.passed')}</Badge>;
      case 'repeat':
        return <Badge className="bg-red-600 text-white">{t('hub.status.repeat')}</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white">{t('hub.status.pending')}</Badge>;
    }
  };

  const primaryGrades = allGrades.filter(g => g.startsWith('Primary'));
  const secondaryGrades = allGrades.filter(g => g.startsWith('Secondary'));
  const gradeOptions = levelType === 'primary' ? primaryGrades : levelType === 'secondary' ? secondaryGrades : [];

  const StudentCard = ({ student }: { student: any }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{student.name}</CardTitle>
              {student.student_id_code && (
                <p className="text-sm font-mono text-primary font-semibold">ID: {student.student_id_code}</p>
              )}
            </div>
          </div>
          {getStatusBadge(student.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{format(new Date(student.dob), 'MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-muted-foreground" />
            <span>{student.current_grade || 'N/A'}</span>
          </div>
        </div>

        {student.schools && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium text-sm">{student.schools.name}</p>
            <p className="text-xs text-muted-foreground">
              {student.schools.district}, {student.schools.sector}
            </p>
          </div>
        )}

        {student.mother_name && student.father_name && (
          <div className="text-sm text-muted-foreground">
            <p><strong>{t('hub.parents')}:</strong> {student.mother_name} & {student.father_name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      {/* Search by Student ID */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('hub.title')}</CardTitle>
          <CardDescription>{t('hub.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder={t('hub.searchPlaceholder')}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchedStudent && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('hub.searchResult')}</h3>
          <StudentCard student={searchedStudent} />
        </div>
      )}

      {/* Re-register Card */}
      {acceptedStudents.length > 0 && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('hub.reregister')}</CardTitle>
                <CardDescription>{t('hub.reregisterDesc')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!showReregister ? (
              <Button onClick={() => setShowReregister(true)} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('hub.startReregister')}
              </Button>
            ) : (
              <div className="space-y-4">
                {/* Select Student */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('hub.selectStudent')}</label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('hub.selectStudent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {acceptedStudents.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (ID: {s.student_id_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Level Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Level</label>
                  <Select value={levelType} onValueChange={(v) => { setLevelType(v); setPreviousClass(''); setNewClass(''); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Primary or Secondary?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Previous Class */}
                {levelType && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Previous Class</label>
                    <Select value={previousClass} onValueChange={setPreviousClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select previous class" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* New Class */}
                {levelType && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">New Class</label>
                    <Select value={newClass} onValueChange={setNewClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new class" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Transcripts */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Transcripts</label>
                  <Input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple onChange={handleReregFiles} />
                  {reregTranscripts.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {reregTranscripts.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                          <div className="flex items-center gap-2 truncate">
                            <Upload className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeReregFile(i)} className="h-6 w-6 p-0">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowReregister(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => reRegisterMutation.mutate()}
                    disabled={reRegisterMutation.isPending || !selectedStudentId || !previousClass || !newClass}
                    className="flex-1"
                  >
                    {reRegisterMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    Submit Re-registration
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* All Students */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{t('hub.myStudents')}</h3>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : myStudents.length === 0 ? (
          <Card className="text-center py-8">
            <CardContent>
              <p className="text-muted-foreground">{t('hub.noStudents')}</p>
              <Button variant="outline" onClick={onBack} className="mt-4">
                {t('hub.registerNow')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {myStudents.map((student: any) => (
              <StudentCard key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHub;
