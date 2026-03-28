import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SchoolSidebar } from '@/components/school/SchoolSidebar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2, Upload, Building2, MapPin, User, GraduationCap, Save, FileText, X, Image as ImageIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { provinces, getDistrictsForProvince, getSectorsForDistrict } from '@/data/rwanda-locations';
import { DocumentUpload } from '@/components/ui/DocumentUpload';
import { splitStoredReferences } from '@/lib/document-access';

const SchoolSettings = () => {
  const { user, loading: authLoading, userRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [schoolName, setSchoolName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showcaseFile, setShowcaseFile] = useState<File | null>(null);
  const [showcasePreview, setShowcasePreview] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [existingPdfPaths, setExistingPdfPaths] = useState<string[]>([]);

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

  useEffect(() => {
    if (school) {
      setSchoolName(school.name || '');
      setStaffName(school.staff_name || '');
      setQualifications(school.qualifications || '');
      setProvince(school.province || '');
      setDistrict(school.district || '');
      setSector(school.sector || '');
      setDescription(school.description || '');
      setLogoPreview(school.logo_url || null);
      setShowcasePreview(school.showcase_image_url || null);
      setExistingPdfPaths(splitStoredReferences(school.requirements_pdf_url));
    }
  }, [school]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!school) return;

      let logoUrl = school.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${school.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('school-logos')
          .upload(fileName, logoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('school-logos').getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      let showcaseUrl = school.showcase_image_url;
      if (showcaseFile) {
        const fileExt = showcaseFile.name.split('.').pop();
        const fileName = `${school.id}-showcase.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('school-logos')
          .upload(fileName, showcaseFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('school-logos').getPublicUrl(fileName);
        showcaseUrl = data.publicUrl;
      }

      // Upload new PDF files
      const newPaths: string[] = [];
      for (const pdfFile of pdfFiles) {
        const pdfFileName = `${school.id}/${Date.now()}-${pdfFile.name}`;
        const { error: pdfUploadError } = await supabase.storage
          .from('school-documents')
          .upload(pdfFileName, pdfFile);
        if (pdfUploadError) throw pdfUploadError;
        newPaths.push(pdfFileName);
      }

      const allPdfPaths = [...existingPdfPaths, ...newPaths];
      const requirementsPdfUrl = allPdfPaths.length > 0 ? allPdfPaths.join(', ') : null;

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
          description: description || null,
          showcase_image_url: showcaseUrl,
        })
        .eq('id', school.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-school'] });
      setPdfFiles([]);
      toast({ title: t('school.settings.saved'), description: t('school.settings.savedDesc') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: t('common.error'), description: t('auth.logoTooLarge'), variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleShowcaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t('common.error'), description: 'Image must be less than 5MB', variant: 'destructive' });
        return;
      }
      setShowcaseFile(file);
      setShowcasePreview(URL.createObjectURL(file));
    }
  };

  const removeExistingPdf = (index: number) => {
    setExistingPdfPaths(prev => prev.filter((_, i) => i !== index));
  };

  const handleProvinceChange = (value: string) => { setProvince(value); setDistrict(''); setSector(''); };
  const handleDistrictChange = (value: string) => { setDistrict(value); setSector(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  if (authLoading || schoolLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (userRole !== 'school_admin') return <Navigate to="/" replace />;
  if (!school) return <Navigate to="/school/register" replace />;

  const availableDistricts = province ? getDistrictsForProvince(province) : [];
  const availableSectors = district ? getSectorsForDistrict(district) : [];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-secondary/30 via-background to-background">
        <SchoolSidebar school={school} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <div className="space-y-8 animate-fade-in">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-primary/80 p-6 lg:p-8 text-primary-foreground shadow-xl">
              <div className="relative">
                <h1 className="text-3xl lg:text-4xl font-display font-bold tracking-tight">{t('school.settings.title')}</h1>
                <p className="text-primary-foreground/80 mt-1 text-lg">{t('school.settings.subtitle')}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* School Logo */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Upload className="w-5 h-5 text-primary" /></div>
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
                        <Input id="logo" type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.info')}</CardTitle>
                      <CardDescription>{t('school.settings.infoDesc')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="schoolName">{t('auth.schoolName')}</Label>
                    <Input id="schoolName" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder={t('auth.schoolNamePlaceholder')} className="h-12" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">School Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Briefly describe your school, its mission, and what makes it unique..." rows={4} />
                  </div>
                </CardContent>
              </Card>

              {/* Showcase Image */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><ImageIcon className="w-5 h-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg font-display">Showcase Image</CardTitle>
                      <CardDescription>Upload a photo that represents your school (displayed on your profile)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {showcasePreview && (
                    <div className="relative mb-4 rounded-xl overflow-hidden border">
                      <img src={showcasePreview} alt="Showcase" className="w-full h-48 object-cover" />
                      <Button type="button" variant="destructive" size="sm" className="absolute top-2 right-2 h-7 w-7 p-0" onClick={() => { setShowcaseFile(null); setShowcasePreview(null); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Label htmlFor="showcase" className="cursor-pointer">
                    <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                      <ImageIcon className="w-6 h-6 mx-auto text-primary/60 mb-2" />
                      <p className="text-sm font-medium text-primary">Upload Showcase Image</p>
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB (JPG, PNG)</p>
                    </div>
                    <Input id="showcase" type="file" accept="image/*" onChange={handleShowcaseChange} className="hidden" />
                  </Label>
                </CardContent>
              </Card>

              {/* Staff Information */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><User className="w-5 h-5 text-accent" /></div>
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
                      <Input id="staffName" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder={t('auth.staffNamePlaceholder')} className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="staffRole">{t('auth.staffRole')}</Label>
                      <Input id="staffRole" value={staffRole} onChange={(e) => setStaffRole(e.target.value)} placeholder={t('auth.staffRolePlaceholder')} className="h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualifications">{t('auth.qualifications')}</Label>
                    <Textarea id="qualifications" value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder={t('auth.qualificationsPlaceholder')} rows={3} />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--osr-sky))]/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-[hsl(var(--osr-sky))]" /></div>
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
                        <SelectTrigger className="h-12"><SelectValue placeholder={t('auth.selectProvince')} /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {provinces.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('auth.district')}</Label>
                      <Select value={district} onValueChange={handleDistrictChange} disabled={!province}>
                        <SelectTrigger className="h-12"><SelectValue placeholder={t('auth.selectDistrict')} /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {availableDistricts.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t('auth.sector')}</Label>
                      <Select value={sector} onValueChange={setSector} disabled={!district}>
                        <SelectTrigger className="h-12"><SelectValue placeholder={t('auth.selectSector')} /></SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {availableSectors.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements Documents */}
              <Card className="border-0 shadow-xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg font-display">{t('school.settings.requirements')}</CardTitle>
                      <CardDescription>Upload admission requirement documents (PDF, max 10MB each)</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Existing uploaded documents */}
                  {existingPdfPaths.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Current Documents</p>
                      {existingPdfPaths.map((path, i) => {
                        const fileName = path.split('/').pop() || `Document ${i + 1}`;
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-8 rounded bg-background flex items-center justify-center border text-[10px] font-bold text-red-600">
                                PDF
                              </div>
                              <span className="text-sm truncate">{decodeURIComponent(fileName.replace(/^\d+-/, ''))}</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeExistingPdf(i)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive flex-shrink-0">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <DocumentUpload
                    files={pdfFiles}
                    onFilesChange={setPdfFiles}
                    accept=".pdf"
                    multiple={true}
                    label="Upload Requirements"
                    hint="PDF files, max 10MB each"
                    maxSizeMB={10}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={updateMutation.isPending} className="px-8 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
                  {updateMutation.isPending ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('common.saving')}</>
                  ) : (
                    <><Save className="w-5 h-5 mr-2" />{t('school.settings.saveChanges')}</>
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
