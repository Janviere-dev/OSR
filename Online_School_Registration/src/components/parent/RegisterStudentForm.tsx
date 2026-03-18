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
import { ArrowLeft, Upload, Loader2, X, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  motherName: z.string().min(2, 'Mother name must be at least 2 characters').max(100),
  fatherName: z.string().min(2, 'Father name must be at least 2 characters').max(100),
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
      schoolId: '',
      currentGrade: '',
    },
  });

  const grades = ['Nursery 1', 'Nursery 2', 'Nursery 3', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selected = Array.from(e.target.files);
    const maxSize = 5 * 1024 * 1024;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

    const validFiles = selected.filter((file) => {
      const validType = allowedTypes.includes(file.type);
      const validSize = file.size <= maxSize;
      return validType && validSize;
    });

    if (validFiles.length !== selected.length) {
      toast({
        title: t('register.error'),
        description: 'Some files were skipped. Only PDF, JPG, PNG up to 5MB are allowed.',
        variant: 'destructive',
      });
    }

    setTranscriptFiles((prev) => {
      const merged = [...prev, ...validFiles];
      return merged.filter(
        (file, index, arr) => arr.findIndex((f) => f.name === file.name && f.size === file.size) === index,
      );
    });

    e.target.value = '';
  };

  const removeTranscriptFile = (indexToRemove: number) => {
    setTranscriptFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let transcriptsUrl = null;

      // Upload transcripts if provided
      if (transcriptFiles.length > 0) {
        const uploadedUrls: string[] = [];

        for (const [index, file] of transcriptFiles.entries()) {
          const fileExt = file.name.split('.').pop();
          const sanitizedBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
          const fileName = `${user.id}/${Date.now()}-${index}-${sanitizedBaseName}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('student-documents')
            .upload(fileName, file, { upsert: false });

          if (uploadError) throw uploadError;

          uploadedUrls.push(fileName);
        }

        transcriptsUrl = JSON.stringify(uploadedUrls);
      }

      // Create student record
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
          status: 'pending',
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Create application record
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      toast({
        title: t('register.error'),
        description: message,
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.studentName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('register.studentNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date of Birth */}
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.dob')}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mother's Name */}
              <FormField
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.motherName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('register.motherNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Father's Name */}
              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.fatherName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('register.fatherNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* School Selection */}
              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.school')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('register.selectSchool')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name} - {school.district}, {school.sector}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Grade Selection */}
              <FormField
                control={form.control}
                name="currentGrade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('register.grade')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('register.selectGrade')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Transcript Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('register.transcript')}</label>
                <div className="border-2 border-dashed border-primary/40 rounded-lg p-4 text-center hover:bg-muted/30 transition-colors">
                  <label htmlFor="register-transcripts" className="cursor-pointer flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="text-sm font-medium">Click to upload</span>
                    <span className="text-xs text-muted-foreground">Add one or more files</span>
                  </label>
                  <Input
                    id="register-transcripts"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {transcriptFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {transcriptFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeTranscriptFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">{t('register.transcriptHint')}</p>
              </div>

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
