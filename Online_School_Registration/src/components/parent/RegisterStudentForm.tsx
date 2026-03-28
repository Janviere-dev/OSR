import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { DocumentUpload } from '@/components/ui/DocumentUpload';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  motherName: z.string().min(2, 'Mother name must be at least 2 characters').max(100),
  fatherName: z.string().min(2, 'Father name must be at least 2 characters').max(100),
  motherPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  fatherPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  parentEmail: z.string().email('Please enter a valid email').max(255).or(z.literal('')),
  schoolId: z.string().min(1, 'Please select a school'),
  currentGrade: z.string().min(1, 'Please select a grade'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterStudentFormProps {
  onBack: () => void;
}

const RegisterStudentForm = ({ onBack }: RegisterStudentFormProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcriptFiles, setTranscriptFiles] = useState<File[]>([]);

  const { data: schools = [] } = useQuery({
    queryKey: ['approved-schools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, district, sector')
        .eq('is_approved', true);
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      dob: '',
      motherName: '',
      fatherName: '',
      motherPhone: '',
      fatherPhone: '',
      parentEmail: '',
      schoolId: '',
      currentGrade: '',
    },
  });

  const grades = [
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
    'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
  ];

  const onSubmit = async (data: RegisterFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let transcriptsUrl = null;

      if (transcriptFiles.length > 0) {
        const uploadedRefs: string[] = [];
        for (const file of transcriptFiles) {
          const fileName = `${user.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(fileName, file);
          if (uploadError) throw uploadError;
          uploadedRefs.push(fileName);
        }
        transcriptsUrl = uploadedRefs.join(',');
      }

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: data.name,
          dob: data.dob,
          parent_id: user.id,
          school_id: data.schoolId,
          current_grade: data.currentGrade,
          mother_name: data.motherName,
          father_name: data.fatherName,
          mother_phone: data.motherPhone,
          father_phone: data.fatherPhone,
          parent_phone: data.motherPhone,
          parent_email: data.parentEmail || null,
          status: 'pending',
        } as any)
        .select()
        .single();

      if (studentError) throw studentError;

      const { error: appError } = await supabase
        .from('applications')
        .insert({
          student_id: student.id,
          school_id: data.schoolId,
          type: 'new',
          transcripts_url: transcriptsUrl,
          status: 'pending',
        });

      if (appError) throw appError;

      toast({
        title: t('register.success'),
        description: t('register.successDesc'),
      });
      onBack();
    } catch (error: any) {
      toast({
        title: t('register.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t('register.title')}</CardTitle>
          <CardDescription>{t('register.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Student Name */}
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.studentName')}</FormLabel>
                  <FormControl><Input placeholder={t('register.studentNamePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Date of Birth */}
              <FormField control={form.control} name="dob" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.dob')}</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Mother Details */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="motherName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.motherName')}</FormLabel>
                    <FormControl><Input placeholder="Mother's full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="motherPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.motherPhone')}</FormLabel>
                    <FormControl><Input placeholder="e.g. 0781234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Father Details */}
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="fatherName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.fatherName')}</FormLabel>
                    <FormControl><Input placeholder="Father's full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.fatherPhone')}</FormLabel>
                    <FormControl><Input placeholder="e.g. 0781234567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Email */}
              <FormField control={form.control} name="parentEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.parentEmail')}</FormLabel>
                  <FormControl><Input type="email" placeholder="parent@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* School */}
              <FormField control={form.control} name="schoolId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.selectSchool')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('register.selectSchoolPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {schools.map((school: any) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name} — {school.district}, {school.sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Grade */}
              <FormField control={form.control} name="currentGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.grade')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('register.gradePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Transcript Upload */}
              <DocumentUpload
                files={transcriptFiles}
                onFilesChange={setTranscriptFiles}
                accept=".pdf"
                label="Upload Transcripts (PDF)"
                hint="Upload student transcripts or academic records — PDF only"
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : (
                  t('register.submit')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterStudentForm;
