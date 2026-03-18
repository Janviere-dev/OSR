import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, Loader2, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { provinces, getDistrictsForProvince, getSectorsForDistrict } from '@/data/rwanda-locations';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signIn, signUp, resendConfirmationEmail, user, userRole } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup'>(
    (searchParams.get('mode') as 'signin' | 'signup') || 'signin'
  );
  const [role, setRole] = useState<'parent' | 'school_admin'>(
    (searchParams.get('role') as 'parent' | 'school_admin') || 'parent'
  );
  const [loading, setLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  
  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // School admin specific fields
  const [schoolName, setSchoolName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'school_admin') {
        navigate('/school');
      } else {
        navigate('/parent');
      }
    }
  }, [user, userRole, navigate]);

  // Reset location fields when province changes
  useEffect(() => {
    setDistrict('');
    setSector('');
  }, [province]);

  // Reset sector when district changes
  useEffect(() => {
    setSector('');
  }, [district]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Error', description: 'Logo must be less than 2MB', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const getReadableErrorMessage = (message?: string) => {
    if (!message) return 'Something went wrong. Please try again.';
    const normalized = message.toLowerCase();
    if (normalized.includes('failed to fetch')) {
      return 'Cannot connect to the server. Check your internet and Supabase project status, then try again.';
    }
    if (normalized.includes('invalid login credentials')) {
      return 'Invalid email or password.';
    }
    if (normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')) {
      return 'Please verify your email first, then sign in.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        const normalized = error.message?.toLowerCase() || '';
        setShowResendConfirmation(
          normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')
        );
        toast({ title: 'Error', description: getReadableErrorMessage(error.message), variant: 'destructive' });
        setLoading(false);
      } else {
        setShowResendConfirmation(false);
        toast({ title: 'Welcome back!' });
      }
    } else {
      // Validation for signup
      if (password !== confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Additional validation for school admins
      if (role === 'school_admin') {
        if (!schoolName || !province || !district || !sector) {
          toast({ title: 'Error', description: 'Please fill in all school details', variant: 'destructive' });
          setLoading(false);
          return;
        }
      }

      const schoolData = role === 'school_admin' ? {
        name: schoolName,
        staffName: fullName,
        staffRole,
        qualifications,
        province,
        district,
        sector,
        logoFile,
      } : undefined;

      const { error, requiresEmailConfirmation } = await signUp(email, password, fullName, role, schoolData);
      if (error) {
        setShowResendConfirmation(false);
        toast({ title: 'Error', description: getReadableErrorMessage(error.message), variant: 'destructive' });
        setLoading(false);
      } else {
        if (requiresEmailConfirmation) {
          setShowResendConfirmation(true);
          toast({ title: 'Account created', description: 'Please check your email and confirm your account before signing in.' });
          setMode('signin');
          setLoading(false);
          return;
        }

        toast({ title: 'Account created successfully!' });
        if (role === 'school_admin') {
          navigate('/school');
        } else {
          navigate('/parent');
        }
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      toast({ title: 'Error', description: 'Enter your email address first.', variant: 'destructive' });
      return;
    }

    setResendingConfirmation(true);
    const { error } = await resendConfirmationEmail(email.trim());

    if (error) {
      toast({ title: 'Error', description: getReadableErrorMessage(error.message), variant: 'destructive' });
    } else {
      toast({ title: 'Confirmation email sent', description: 'Check your inbox and spam folder for the verification link.' });
    }

    setResendingConfirmation(false);
  };

  const availableDistricts = province ? getDistrictsForProvince(province) : [];
  const availableSectors = district ? getSectorsForDistrict(district) : [];

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-card p-8 border border-border/50">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {mode === 'signin' ? t('auth.signin.title') : t('auth.signup.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {mode === 'signin' ? t('auth.signin.subtitle') : t('auth.signup.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <Label htmlFor="fullName">{t('auth.fullname')}</Label>
                  <Input 
                    id="fullName" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required 
                    className="mt-1 input-focus" 
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <Label>{t('auth.role')}</Label>
                  <RadioGroup 
                    value={role} 
                    onValueChange={(v) => setRole(v as 'parent' | 'school_admin')} 
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="parent" id="parent" />
                      <Label htmlFor="parent">{t('auth.role.parent')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="school_admin" id="school_admin" />
                      <Label htmlFor="school_admin">{t('auth.role.school')}</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* School Admin Specific Fields */}
                {role === 'school_admin' && (
                  <div className="space-y-4 p-4 bg-secondary/50 rounded-lg border border-border">
                    <h3 className="font-semibold text-foreground">{t('auth.school.details') || 'School Details'}</h3>
                    
                    <div>
                      <Label htmlFor="schoolName">{t('auth.school.name') || 'School Name'}</Label>
                      <Input 
                        id="schoolName" 
                        value={schoolName} 
                        onChange={(e) => setSchoolName(e.target.value)} 
                        required 
                        className="mt-1 input-focus" 
                        placeholder="Enter school name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="staffRole">{t('auth.school.staffRole') || 'Your Role in School'}</Label>
                      <Input 
                        id="staffRole" 
                        value={staffRole} 
                        onChange={(e) => setStaffRole(e.target.value)} 
                        className="mt-1 input-focus" 
                        placeholder="e.g., Principal, Head Teacher, Director"
                      />
                    </div>

                    <div>
                      <Label htmlFor="qualifications">{t('auth.school.qualifications') || 'Qualifications'}</Label>
                      <Input 
                        id="qualifications" 
                        value={qualifications} 
                        onChange={(e) => setQualifications(e.target.value)} 
                        className="mt-1 input-focus" 
                        placeholder="e.g., Bachelor's in Education"
                      />
                    </div>

                    {/* Location Selection */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label>{t('auth.school.province') || 'Province'}</Label>
                        <Select value={province} onValueChange={setProvince}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select province" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t('auth.school.district') || 'District'}</Label>
                        <Select value={district} onValueChange={setDistrict} disabled={!province}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select district" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableDistricts.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t('auth.school.sector') || 'Sector'}</Label>
                        <Select value={sector} onValueChange={setSector} disabled={!district}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSectors.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Logo Upload */}
                    <div>
                      <Label>{t('auth.school.logo') || 'School Logo'}</Label>
                      {logoPreview ? (
                        <div className="mt-2 relative inline-block">
                          <img 
                            src={logoPreview} 
                            alt="School logo preview" 
                            className="w-24 h-24 object-contain rounded-lg border border-border"
                          />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="mt-2 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground mt-1">Upload logo (max 2MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="mt-1 input-focus" 
              />
            </div>

            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                minLength={6} 
                className="mt-1 input-focus" 
              />
            </div>

            {mode === 'signup' && (
              <div>
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword') || 'Confirm Password'}</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={6} 
                  className="mt-1 input-focus" 
                />
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'signin' ? t('auth.submit.signin') : t('auth.submit.signup')}
            </Button>

            {mode === 'signin' && showResendConfirmation && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendConfirmation}
                disabled={resendingConfirmation}
              >
                {resendingConfirmation && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Resend confirmation email
              </Button>
            )}
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === 'signin' ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button 
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} 
              className="text-primary hover:underline font-medium"
            >
              {mode === 'signin' ? t('auth.submit.signup') : t('auth.submit.signin')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}