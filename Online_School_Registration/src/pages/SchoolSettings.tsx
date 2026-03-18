import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, 
  Upload, 
  Building2, 
  MapPin, 
  User, 
  GraduationCap,
  Save,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { provinces, getDistrictsForProvince, getSectorsForDistrict } from '@/data/rwanda-locations';

type SchoolSettingsRecord = {
  name: string | null;
  staff_name: string | null;
  qualifications: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  logo_url: string | null;
  requirements_pdf_url?: string | null;
  flutterwave_payout_mobile_network?: string | null;
  flutterwave_payout_mobile_number?: string | null;
};

const SchoolSettings = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [schoolName, setSchoolName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | null>(null);
  const [payoutNetwork, setPayoutNetwork] = useState('');
  const [payoutPhoneNumber, setPayoutPhoneNumber] = useState('');

  // Fetch school data
  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['my-school', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('admin_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Populate form when school data loads
  useEffect(() => {
    if (school) {
      const schoolData = school as unknown as SchoolSettingsRecord;
      setSchoolName(schoolData.name || '');
      setStaffName(schoolData.staff_name || '');
      setQualifications(schoolData.qualifications || '');
      setProvince(schoolData.province || '');
      setDistrict(schoolData.district || '');
      setSector(schoolData.sector || '');
      setLogoPreview(schoolData.logo_url || null);
      setCurrentPdfUrl(schoolData.requirements_pdf_url || null);
      setPayoutNetwork(schoolData.flutterwave_payout_mobile_network || '');
      setPayoutPhoneNumber(schoolData.flutterwave_payout_mobile_number || '');
    }
  }, [school]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!school) return;

      let logoUrl = school.logo_url;

      // Upload new logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${school.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('school-logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('school-logos')
          .getPublicUrl(fileName);
        
        logoUrl = data.publicUrl;
      }

      // Upload requirements PDF if provided
      let requirementsPdfUrl = (school as unknown as SchoolSettingsRecord).requirements_pdf_url;
      if (pdfFile) {
        const pdfFileName = `${school.id}-requirements.pdf`;
        
        const { error: pdfUploadError } = await supabase.storage
          .from('school-documents')
          .upload(pdfFileName, pdfFile, { upsert: true });

        if (pdfUploadError) throw pdfUploadError;

        const { data: pdfData } = supabase.storage
          .from('school-documents')
          .getPublicUrl(pdfFileName);
        
        requirementsPdfUrl = pdfData.publicUrl;
      }

      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolName,
          staff_name: staffName,
          qualifications: qualifications || null,
          province,
          district,
          sector,
          logo_url: logoUrl,
          requirements_pdf_url: requirementsPdfUrl,
          flutterwave_payout_mobile_network: payoutNetwork || null,
          flutterwave_payout_mobile_number:
            payoutPhoneNumber.replace(/\D/g, '').replace(/^0+/, '') || null,
        } as any)
        .eq('id', school.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-school'] });
      toast({
        title: t('school.settings.saved'),
        description: t('school.settings.savedDesc'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: 'PDF must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      if (file.type !== 'application/pdf') {
        toast({
          title: t('common.error'),
          description: 'Only PDF files are allowed',
          variant: 'destructive',
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: t('common.error'),
          description: t('auth.logoTooLarge'),
          variant: 'destructive',
        });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleProvinceChange = (value: string) => {
    setProvince(value);
    setDistrict('');
    setSector('');
  };

  const handleDistrictChange = (value: string) => {
    setDistrict(value);
    setSector('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if ((payoutNetwork && !payoutPhoneNumber) || (!payoutNetwork && payoutPhoneNumber)) {
      toast({
        title: t('common.error'),
        description: 'Please provide both payout network and mobile number.',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate();
  };

  if (authLoading || schoolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole !== 'school_admin') {
    return <Navigate to="/" replace />;
  }

  if (!school) {
    return <Navigate to="/school/register" replace />;
  }

  const availableDistricts = province ? getDistrictsForProvince(province) : [];
  const availableSectors = district ? getSectorsForDistrict(district) : [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-secondary/30 via-background to-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {/* Decorative background */}
          <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-20 w-60 h-60 bg-accent/5 rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 lg:p-8 text-primary-foreground shadow-xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">
                  {t('school.settings.title')}
                </h1>
                <p className="text-primary-foreground/80 mt-1 text-lg">
                  {t('school.settings.subtitle')}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Logo Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.logo')}</CardTitle>
                      <CardDescription>{t('school.settings.logoDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden ring-2 ring-primary/20 shadow-lg">
                      {logoPreview ? (
                        <img src={logoPreview} alt="School logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-10 h-10 text-primary/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="logo" className="cursor-pointer">
                        <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                          <Upload className="w-6 h-6 mx-auto text-primary/60 mb-2" />
                          <p className="text-sm font-medium text-primary">{t('auth.uploadLogo')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{t('auth.logoHint')}</p>
                        </div>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* School Information Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.info')}</CardTitle>
                      <CardDescription>{t('school.settings.infoDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">{t('auth.schoolName')}</Label>
                    <Input
                      id="schoolName"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder={t('auth.schoolNamePlaceholder')}
                      className="h-12"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Staff Information Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.staff')}</CardTitle>
                      <CardDescription>{t('school.settings.staffDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="staffName">{t('auth.staffName')}</Label>
                      <Input
                        id="staffName"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        placeholder={t('auth.staffNamePlaceholder')}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staffRole">{t('auth.staffRole')}</Label>
                      <Input
                        id="staffRole"
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value)}
                        placeholder={t('auth.staffRolePlaceholder')}
                        className="h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">{t('auth.qualifications')}</Label>
                    <Textarea
                      id="qualifications"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      placeholder={t('auth.qualificationsPlaceholder')}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Location Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-sky))]/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[hsl(var(--osr-sky))]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.location')}</CardTitle>
                      <CardDescription>{t('school.settings.locationDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t('auth.province')}</Label>
                      <Select value={province} onValueChange={handleProvinceChange}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={t('auth.selectProvince')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {provinces.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('auth.district')}</Label>
                      <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={t('auth.selectDistrict')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {availableDistricts.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('auth.sector')}</Label>
                      <Select value={sector} onValueChange={setSector} disabled={!district}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder={t('auth.selectSector')} />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {availableSectors.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements PDF Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.requirements')}</CardTitle>
                      <CardDescription>{t('school.settings.requirementsDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {currentPdfUrl && !pdfFile && (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium flex-1">{t('school.settings.currentPdf')}</span>
                      <a
                        href={currentPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        {t('school.settings.viewPdf')}
                      </a>
                    </div>
                  )}
                  <Label htmlFor="requirementsPdf" className="cursor-pointer">
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <FileText className="w-6 h-6 mx-auto text-primary/60 mb-2" />
                      <p className="text-sm font-medium text-primary">
                        {currentPdfUrl ? t('school.settings.replacePdf') : t('school.settings.uploadPdf')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('school.settings.pdfHint')}</p>
                      {pdfFile && (
                        <p className="text-xs text-primary mt-2 font-medium">✓ {pdfFile.name}</p>
                      )}
                    </div>
                    <Input
                      id="requirementsPdf"
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfChange}
                      className="hidden"
                    />
                  </Label>
                </CardContent>
              </Card>

              {/* Payout Destination Card */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-display">School Payout Destination</CardTitle>
                      <CardDescription>
                        Parent fee payments will be transferred to this school mobile money account after verification.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mobile Money Network</Label>
                      <Select value={payoutNetwork} onValueChange={setPayoutNetwork}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="MTN">MTN MoMo</SelectItem>
                          <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Number (Rwanda)</Label>
                      <Input
                        value={payoutPhoneNumber}
                        onChange={(e) => setPayoutPhoneNumber(e.target.value)}
                        placeholder="e.g. 078xxxxxxx"
                        className="h-12"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={updateMutation.isPending}
                  className="px-8 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t('common.saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      {t('school.settings.saveChanges')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default SchoolSettings;