import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, BadgeCheck } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import { sendSystemMessage } from '@/hooks/useSendSystemMessage';
import { createDocumentMarker, createPaymentMarker } from '@/lib/document-access';

interface PaymentFormProps {
  onBack: () => void;
}

const PaymentForm = ({ onBack }: PaymentFormProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');

  // Fetch students with their school info
  const { data: students = [] } = useQuery({
    queryKey: ['my-students-for-payment', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          current_grade,
          school_id,
          schools!inner(id, name, admin_id)
        `)
        .eq('parent_id', user.id)
        .not('school_id', 'is', null);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ['my-payments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          currency,
          status,
          description,
          proof_payment_url,
          created_at,
          students!inner(name),
          schools!inner(name)
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmitProof = async () => {
    if (!user || !selectedStudent || !amount || proofFiles.length === 0) {
      toast({
        title: t('payment.error'),
        description: t('payment.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: t('payment.error'),
        description: t('payment.invalidAmount'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const student = students.find((s: any) => s.id === selectedStudent);
      if (!student) throw new Error('Student not found');

      // Upload proof files
      const uploadedRefs: string[] = [];
      for (const [index, file] of proofFiles.entries()) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${index}-payment-proof.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('student-documents')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        uploadedRefs.push(fileName);
      }

      // Create payment record — pending until admin confirms
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          student_id: student.id,
          school_id: (student as any).schools.id,
          parent_id: user.id,
          amount: parsedAmount,
          proof_payment_url: uploadedRefs.join(','),
          description: description || null,
          status: 'unpaid',
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // Notify school admin — they must confirm payment via chat to enroll the student
      const schoolAdminId = (student as any).schools.admin_id;
      if (schoolAdminId && payment) {
        await sendSystemMessage({
          senderId: user.id,
          receiverId: schoolAdminId,
          content: `💰 Payment proof submitted for ${(student as any).name} — Amount: ${parsedAmount} RWF. Please review and confirm.\n\n${createDocumentMarker('student-documents', 'Payment Proof', uploadedRefs)}\n${createPaymentMarker(payment.id)}`,
        });
      }

      toast({
        title: t('payment.success'),
        description: t('payment.successDesc'),
      });

      // Reset form
      setSelectedStudent('');
      setAmount('');
      setProofFiles([]);
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
    } catch (error: any) {
      toast({
        title: t('payment.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-600 text-white"><BadgeCheck className="w-3 h-3 mr-1" />{t('payment.statusCompleted')}</Badge>;
      case 'failed':
      case 'rejected':
        return <Badge className="bg-red-600 text-white">{t('payment.statusFailed')}</Badge>;
      default:
        return <Badge className="bg-amber-500 text-white">{t('payment.statusPending')}</Badge>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      {/* Payment Proof Upload Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
              <Upload className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
               <CardTitle>Payment Proof</CardTitle>
               <CardDescription>Upload a bank slip, transfer confirmation, or any payment evidence for school fee verification.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('payment.noStudents')}</p>
              <Button variant="outline" onClick={onBack} className="mt-4">
                {t('payment.registerFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Select Student */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('payment.selectStudent')}</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('payment.selectStudentPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student: any) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - {student.schools.name} ({student.current_grade || '-'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('payment.amount')} (RWF)</label>
                <Input
                  type="number"
                  placeholder={t('payment.amountPlaceholder')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="e.g. School fees for Term 1, Uniform payment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Proof Upload */}
              <DocumentUpload
                files={proofFiles}
                onFilesChange={setProofFiles}
                accept=".pdf"
                label="Payment Proof (PDF)"
                hint="Upload bank slip, transfer confirmation, or receipt — PDF only"
                maxSizeMB={5}
              />

              <Button
                onClick={handleSubmitProof}
                className="w-full"
                disabled={isSubmitting || !selectedStudent || !amount || proofFiles.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.submitting')}
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Payment Proof
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('payment.history')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('payment.historyStudent')}</TableHead>
                    <TableHead>{t('payment.historySchool')}</TableHead>
                    <TableHead>{t('payment.historyAmount')}</TableHead>
                    <TableHead>{t('payment.historyDate')}</TableHead>
                    <TableHead>{t('payment.historyStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.students.name}</TableCell>
                      <TableCell>{payment.schools.name}</TableCell>
                      <TableCell>{payment.amount} {payment.currency}</TableCell>
                      <TableCell>{format(new Date(payment.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentForm;
