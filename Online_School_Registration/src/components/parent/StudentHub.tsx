import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, User, Calendar, School, RefreshCw, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface StudentHubProps {
  onBack: () => void;
}

const StudentHub = ({ onBack }: StudentHubProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchId, setSearchId] = useState('');
  const [searchedStudent, setSearchedStudent] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all students for this parent
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

  // Search by student ID code
  const handleSearch = async () => {
    if (!searchId.trim() || !user) return;
    setIsSearching(true);

    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          schools(name, district, sector)
        `)
        .eq('parent_id', user.id)
        .eq('student_id_code', searchId.trim())
        .single();

      if (error) {
        setSearchedStudent(null);
        toast({
          title: t('hub.notFound'),
          description: t('hub.notFoundDesc'),
          variant: 'destructive',
        });
      } else {
        setSearchedStudent(data);
      }
    } catch (error) {
      setSearchedStudent(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Re-register mutation
  const reRegisterMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const student = myStudents.find((s: any) => s.id === studentId);
      if (!student || !student.school_id) throw new Error('Student or school not found');

      // Create new application for the new year
      const { error } = await supabase
        .from('applications')
        .insert({
          student_id: studentId,
          school_id: student.school_id,
          type: 'new',
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: t('hub.reregisterSuccess'),
        description: t('hub.reregisterSuccessDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['my-students-full'] });
    },
    onError: (error: any) => {
      toast({
        title: t('hub.reregisterError'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <Badge className="bg-secondary">{t('hub.status.passed')}</Badge>;
      case 'repeat':
        return <Badge variant="destructive">{t('hub.status.repeat')}</Badge>;
      default:
        return <Badge variant="secondary">{t('hub.status.pending')}</Badge>;
    }
  };

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
                <p className="text-sm text-muted-foreground">ID: {student.student_id_code}</p>
              )}
            </div>
          </div>
          {getStatusBadge(student.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
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

        {/* Show re-register button for passed students */}
        {student.status === 'passed' && (
          <Button 
            className="w-full mt-4" 
            variant="outline"
            onClick={() => reRegisterMutation.mutate(student.id)}
            disabled={reRegisterMutation.isPending}
          >
            {reRegisterMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {t('hub.reregister')}
          </Button>
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
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searchedStudent && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t('hub.searchResult')}</h3>
          <StudentCard student={searchedStudent} />
        </div>
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
