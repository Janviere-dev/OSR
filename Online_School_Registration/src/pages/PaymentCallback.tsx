import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const txRef = searchParams.get('tx_ref');
      const transactionId = searchParams.get('transaction_id');
      const flwStatus = searchParams.get('status');

      if (!txRef || !transactionId || flwStatus !== 'successful') {
        setStatus('failed');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { tx_ref: txRef, transaction_id: transactionId },
        });

        if (error) throw error;

        if (data.status === 'success') {
          setStatus('success');
          setPaymentDetails(data);
        } else {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-16 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
                <CardTitle>{t('payment.verifying')}</CardTitle>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
                <CardTitle className="text-secondary">{t('payment.verified')}</CardTitle>
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <CardTitle className="text-destructive">{t('payment.failed')}</CardTitle>
              </>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === 'success' && paymentDetails && (
              <p className="text-muted-foreground">
                {t('payment.amountPaid')}: {paymentDetails.amount} {paymentDetails.currency}
              </p>
            )}
            {status === 'failed' && (
              <p className="text-muted-foreground">{t('payment.failedDesc')}</p>
            )}
            {status !== 'verifying' && (
              <Button onClick={() => navigate('/parent')} className="w-full">
                {t('payment.backToDashboard')}
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCallback;
