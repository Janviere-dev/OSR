import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Loader2, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const transferSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  motherName: z.string().min(2, 'Mother name must be at least 2 characters').max(100),
  fatherName: z.string().min(2, 'Father name must be at least 2 characters').max(100),
  motherPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  fatherPhone: z.string().min(10, 'Phone number must be at least 10 digits').max(15),
  parentEmail: z.string().email('Please enter a valid email').max(255).or(z.literal('')),
  previousSchoolName: z.string().min(2, 'Previous school name is required').max(200),
  newSchoolId: z.string().min(1, 'Please select the new school'),
  currentGrade: z.string().min(1, 'Please select a grade'),
  transferReason: z.string().min(10, 'Please provide a reason for transfer').max(500),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferStudentFormProps {
  onBack: () => void;
}

const TransferStudentForm = ({ onBack }: TransferStudentFormProps) => {
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

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      name: '',
      dob: '',
      motherName: '',
      fatherName: '',
      motherPhone: '',
      fatherPhone: '',
      parentEmail: '',
      previousSchoolName: '',
      newSchoolId: '',
      currentGrade: '',
      transferReason: '',
    },
  });

  const grades = [
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
    'Secondary 1', 'Secondary 2', 'Secondary 3', 'Secondary 4', 'Secondary 5', 'Secondary 6',
  ];

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setTranscriptFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setTranscriptFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TransferFormData) => {
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
          school_id: data.newSchoolId,
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
          school_id: data.newSchoolId,
          type: 'transfer',
          previous_school_name: data.previousSchoolName,
          transfer_reason: data.transferReason,
          transcripts_url: transcriptsUrl,
          status: 'pending',
        });

      if (appError) throw appError;

      toast({
        title: t('transfer.success'),
        description: t('transfer.successDesc'),
      });
      onBack();
    } catch (error: any) {
      toast({
        title: t('transfer.error'),
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
          <CardTitle>{t('transfer.title')}</CardTitle>
          <CardDescription>{t('transfer.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Child Name */}
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

              {/* Mother's Name */}
              <FormField control={form.control} name="motherName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.motherName')}</FormLabel>
                  <FormControl><Input placeholder={t('register.motherNamePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Mother's Phone */}
              <FormField control={form.control} name="motherPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.motherPhone')}</FormLabel>
                  <FormControl><Input placeholder="e.g., 0788123456" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Father's Name */}
              <FormField control={form.control} name="fatherName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.fatherName')}</FormLabel>
                  <FormControl><Input placeholder={t('register.fatherNamePlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Father's Phone */}
              <FormField control={form.control} name="fatherPhone" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.fatherPhone')}</FormLabel>
                  <FormControl><Input placeholder="e.g., 0788654321" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Parent Email */}
              <FormField control={form.control} name="parentEmail" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.parentEmail')}</FormLabel>
                  <FormControl><Input type="email" placeholder={t('register.parentEmailPlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Grade */}
              <FormField control={form.control} name="currentGrade" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('register.grade')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('register.selectGrade')} /></SelectTrigger>
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

              {/* Previous School */}
              <FormField control={form.control} name="previousSchoolName" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transfer.previousSchool')}</FormLabel>
                  <FormControl><Input placeholder={t('transfer.previousSchoolPlaceholder')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* New School */}
              <FormField control={form.control} name="newSchoolId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transfer.newSchool')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('transfer.selectNewSchool')} /></SelectTrigger>
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
              )} />

              {/* Transfer Reason */}
              <FormField control={form.control} name="transferReason" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('transfer.reason')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('transfer.reasonPlaceholder')} className="resize-none" rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Transcripts Upload - Multiple with list */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('transfer.transcripts')}</label>
                <Input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFilesChange}
                />
                {transcriptFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    {transcriptFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm">
                        <div className="flex items-center gap-2 truncate">
                          <Upload className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('transfer.transcriptsHint')}</p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('common.submitting')}</>
                ) : (
                  t('transfer.submit')
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransferStudentForm;
