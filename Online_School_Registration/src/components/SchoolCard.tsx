import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, GraduationCap, FileText, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { splitStoredReferences } from '@/lib/document-access';

interface SchoolCardProps {
  school: {
    id: string;
    name: string;
    logo_url: string | null;
    province: string;
    district: string;
    sector: string;
    requirements_pdf_url?: string | null;
    description?: string | null;
    showcase_image_url?: string | null;
  };
}

export function SchoolCard({ school }: SchoolCardProps) {
  const { t } = useLanguage();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleApply = () => {
    if (!user) {
      navigate('/auth');
    } else if (userRole === 'parent') {
      navigate('/parent');
    } else {
      navigate('/auth');
    }
  };

  const requirementPaths = splitStoredReferences(school.requirements_pdf_url);

  const openRequirement = async (path: string) => {
    try {
      const { getAccessibleDocumentUrl } = await import('@/lib/document-access');
      const url = await getAccessibleDocumentUrl(path, 'school-documents');
      // Use blob fetch to avoid ad-blocker interference
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  return (
    <>
      <div className="card-school">
        <div className="h-40 bg-secondary flex items-center justify-center">
          {school.showcase_image_url ? (
            <img src={school.showcase_image_url} alt={school.name} className="w-full h-full object-cover" />
          ) : school.logo_url ? (
            <img src={school.logo_url} alt={`${school.name} logo`} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <GraduationCap className="w-12 h-12" />
              <span className="text-sm">School Logo</span>
            </div>
          )}
        </div>

        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-foreground mb-2 line-clamp-2">{school.name}</h3>
          <div className="flex items-start gap-2 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{school.sector}, {school.district}, {school.province}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setDetailsOpen(true)}>
              {t('schools.viewDetails')}
            </Button>
            <Button size="sm" className="flex-1" onClick={handleApply}>
              {t('schools.apply')}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t('schools.detailTitle')}</DialogTitle>
            <DialogDescription>{school.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* School header - logo, name, location at top */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">{school.name}</h3>
                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{school.sector}, {school.district}, {school.province}</span>
                </div>
              </div>
            </div>

            {/* Showcase image */}
            {school.showcase_image_url && (
              <div className="rounded-xl overflow-hidden border">
                <img src={school.showcase_image_url} alt={school.name} className="w-full h-48 object-cover" />
              </div>
            )}

            {/* Description */}
            {school.description && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-foreground">About</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{school.description}</p>
              </div>
            )}

            {/* Requirements - clickable download buttons instead of iframe */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">{t('schools.requirements')}</h4>
              {requirementPaths.length > 0 ? (
                <div className="space-y-2">
                  {requirementPaths.map((path, i) => {
                    const fileName = decodeURIComponent(path.split('/').pop()?.replace(/^\d+-/, '') || `Requirement ${i + 1}`);
                    return (
                      <Button key={i} variant="outline" size="sm" className="w-full justify-start" onClick={() => openRequirement(path)}>
                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{fileName}</span>
                        <ExternalLink className="w-3 h-3 ml-auto flex-shrink-0" />
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-lg">
                  {t('schools.noRequirements')}
                </p>
              )}
            </div>

            {/* Apply Button */}
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                {!user ? 'Create an account or sign in to apply to this school.' : 'Ready to apply? Click below to start your application.'}
              </p>
              <Button className="w-full" size="lg" onClick={() => { setDetailsOpen(false); handleApply(); }}>
                {user ? t('schools.applyNow') : 'Sign Up to Apply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}