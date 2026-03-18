import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, CreditCard, Smartphone, BadgeCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface PaymentFormProps {
  onBack: () => void;
}

interface StudentForPayment {
  id: string;
  name: string;
  current_grade: string | null;
  school_id: string;
  schools: {
    id: string;
    name: string;
  };
}

interface PaymentHistoryRow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  description: string | null;
  created_at: string;
  students: {
    name: string;
  };
  schools: {
    name: string;
  };
}

const getEdgeFunctionErrorMessage = async (error: unknown): Promise<string> => {
  if (!error || typeof error !== 'object') {
    return 'Unknown payment error';
  }

  const maybeError = error as {
    message?: string;
    context?: {
      json?: () => Promise<{ error?: string; message?: string }>;
      text?: () => Promise<string>;
    };
  };

  if (maybeError.context?.json) {
    try {
      const body = await maybeError.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      // ignore JSON parse failures and fallback to other formats
    }
  }

  if (maybeError.context?.text) {
    try {
      const text = await maybeError.context.text();
      if (text) return text;
    } catch {
      // ignore text parse failures and fallback to generic message
    }
  }

  return maybeError.message || 'Unknown payment error';
};

const PaymentForm = ({ onBack }: PaymentFormProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [amount, setAmount] = useState('');
  const [mobileNetwork, setMobileNetwork] = useState<'MTN' | 'AIRTEL'>('MTN');
  const [phoneNumber, setPhoneNumber] = useState('');

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
          schools!inner(id, name)
        `)
        .eq('parent_id', user.id)
        .not('school_id', 'is', null);
      if (error) throw error;
      return (data ?? []) as StudentForPayment[];
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
          payment_method,
          description,
          created_at,
          students!inner(name),
          schools!inner(name)
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PaymentHistoryRow[];
    },
    enabled: !!user,
  });

  const handlePayWithFlutterwave = async () => {
    if (!user || !selectedStudent || !amount || !phoneNumber) {
      toast({
        title: t('payment.error'),
        description: t('payment.fillAllFields'),
        variant: 'destructive',
      });
      return;
    }

    const cleanedPhone = phoneNumber.replace(/\D/g, '').replace(/^0+/, '');
    if (cleanedPhone.length < 7 || cleanedPhone.length > 10) {
      toast({
        title: t('payment.error'),
        description: 'Enter a valid Rwanda mobile number without country code.',
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
      const student = students.find((s) => s.id === selectedStudent);
      if (!student) throw new Error('Student not found');

      const configuredAppUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
      const baseUrl = configuredAppUrl || window.location.origin;
      const redirectUrl = new URL('/payment/callback', baseUrl).toString();

      if (!redirectUrl.startsWith('https://')) {
        throw new Error(
          'Invalid callback URL. Configure VITE_PUBLIC_APP_URL with your public https app URL (for example: https://your-domain.com).'
        );
      }

      const { data, error } = await supabase.functions.invoke('initialize-payment', {
        body: {
          studentId: student.id,
          amount: parsedAmount,
          redirectUrl,
          mobileMoney: {
            network: mobileNetwork,
            countryCode: '250',
            phoneNumber: cleanedPhone,
          },
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Redirect to Flutterwave payment page
      window.location.href = data.payment_link;

    } catch (error: unknown) {
      const message = await getEdgeFunctionErrorMessage(error);
      const isEdgeUnavailable = message.includes('Failed to send a request to the Edge Function');

      toast({
        title: t('payment.error'),
        description: isEdgeUnavailable
          ? 'Payment service is not deployed yet. Deploy initialize-payment and verify-payment Edge Functions, then try again.'
          : message,
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-secondary"><BadgeCheck className="w-3 h-3 mr-1" />{t('payment.statusCompleted')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('payment.statusFailed')}</Badge>;
      default:
        return <Badge variant="outline">{t('payment.statusPending')}</Badge>;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back')}
      </Button>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <CardTitle>{t('payment.title')}</CardTitle>
              <CardDescription>{t('payment.flutterwaveDesc')}</CardDescription>
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
                    {students.map((student) => (
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Mobile Money Network</label>
                  <Select value={mobileNetwork} onValueChange={(v) => setMobileNetwork(v as 'MTN' | 'AIRTEL')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MTN">MTN MoMo</SelectItem>
                      <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number (Rwanda)</label>
                  <Input
                    type="tel"
                    placeholder="e.g. 078xxxxxxx"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              {/* Payment Methods Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">{t('payment.acceptedMethods')}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Smartphone className="w-3 h-3" /> MTN MoMo
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Smartphone className="w-3 h-3" /> Airtel Money
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <CreditCard className="w-3 h-3" /> {t('payment.cards')}
                  </Badge>
                </div>
              </div>

              <Button
                onClick={handlePayWithFlutterwave}
                className="w-full"
                disabled={isSubmitting || !selectedStudent || !amount || !phoneNumber}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('payment.processing')}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('payment.payNow')}
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
                  {payments.map((payment) => (
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
