import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, ArrowRightLeft, CreditCard, Users, MessageSquare } from 'lucide-react';
import RegisterStudentForm from '@/components/parent/RegisterStudentForm';
import TransferStudentForm from '@/components/parent/TransferStudentForm';
import PaymentForm from '@/components/parent/PaymentForm';
import StudentHub from '@/components/parent/StudentHub';
import ChatInbox from '@/components/chat/ChatInbox';

type ActiveView = 'dashboard' | 'register' | 'transfer' | 'payment' | 'hub' | 'inbox';

const ParentDashboard = () => {
  const { user, loading, userRole } = useAuth();
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'parent') {
    return <Navigate to="/" replace />;
  }

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Parent';

  const renderContent = () => {
    switch (activeView) {
      case 'register':
        return <RegisterStudentForm onBack={() => setActiveView('dashboard')} />;
      case 'transfer':
        return <TransferStudentForm onBack={() => setActiveView('dashboard')} />;
      case 'payment':
        return <PaymentForm onBack={() => setActiveView('dashboard')} />;
      case 'hub':
        return <StudentHub onBack={() => setActiveView('dashboard')} />;
      case 'inbox':
        return <ChatInbox role="parent" onBack={() => setActiveView('dashboard')} />;
      default:
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center py-8">
              <h1 className="text-3xl font-display font-bold text-foreground">
                {t('dashboard.welcome')}, {userName}! 👋
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('dashboard.subtitle')}
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Register New Student */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50" onClick={() => setActiveView('register')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{t('dashboard.registerStudent')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.registerStudentDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
<Button className="w-full">{t('dashboard.startRegistration')} <ArrowLeft className="ml-2 w-4 h-4 rotate-180" /></Button>
                </CardContent>
              </Card>

              {/* Transfer Student */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-secondary/50" onClick={() => setActiveView('transfer')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                    <ArrowRightLeft className="w-8 h-8 text-secondary" />
                  </div>
                  <CardTitle className="text-xl">{t('dashboard.transferStudent')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.transferStudentDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
<Button variant="secondary" className="w-full">{t('dashboard.startTransfer')} <ArrowLeft className="ml-2 w-4 h-4 rotate-180" /></Button>
                </CardContent>
              </Card>

              {/* Payment */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-accent/50" onClick={() => setActiveView('payment')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl">{t('dashboard.payment')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.paymentDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
<Button variant="outline" className="w-full">{t('dashboard.submitPayment')} <ArrowLeft className="ml-2 w-4 h-4 rotate-180" /></Button>
                </CardContent>
              </Card>

              {/* Student Hub */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-muted/50" onClick={() => setActiveView('hub')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">{t('dashboard.studentHub')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.studentHubDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
<Button variant="ghost" className="w-full">{t('dashboard.viewStudents')} <ArrowLeft className="ml-2 w-4 h-4 rotate-180" /></Button>
                </CardContent>
              </Card>

              {/* Inbox */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/30 md:col-span-2" onClick={() => setActiveView('inbox')}>
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{t('dashboard.inbox')}</CardTitle>
                  <CardDescription>
                    {t('dashboard.inboxDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
<Button variant="outline" className="w-full">{t('dashboard.openInbox')} <ArrowLeft className="ml-2 w-4 h-4 rotate-180" /></Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        {activeView !== 'dashboard' && (
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => setActiveView('dashboard')} className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>
          </div>
        )}
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
};

export default ParentDashboard;
