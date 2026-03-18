import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { MapPin, GraduationCap, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SchoolCardProps {
  school: {
    id: string;
    name: string;
    logo_url: string | null;
    province: string;
    district: string;
    sector: string;
    requirements_pdf_url?: string | null;
  };
}

export function SchoolCard({ school }: SchoolCardProps) {
  const { t } = useLanguage();
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const handleApply = () => {
    if (!user) {
      navigate('/auth');
    } else if (userRole === 'parent') {
      navigate('/parent');
    } else {
      navigate('/auth');
    }
  };

  const handleDownloadPdf = async () => {
    if (!school.requirements_pdf_url) return;
    try {
      const response = await fetch(school.requirements_pdf_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${school.name}-requirements.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  return (
    <>
      <div className="card-school">
        {/* Logo Placeholder */}
        <div className="h-40 bg-secondary flex items-center justify-center">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={`${school.name} logo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <GraduationCap className="w-12 h-12" />
              <span className="text-sm">School Logo</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-lg font-semibold text-foreground mb-2 line-clamp-2">
            {school.name}
          </h3>

          <div className="flex items-start gap-2 text-muted-foreground mb-4">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">
              {school.sector}, {school.district}, {school.province}
            </span>
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

      {/* School Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setShowPdf(false); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t('schools.detailTitle')}</DialogTitle>
            <DialogDescription>{school.name}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* School header */}
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

            {/* Requirements PDF */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">{t('schools.requirements')}</h4>
              {school.requirements_pdf_url ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPdf(!showPdf)}
                      className="flex-1"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {showPdf ? 'Hide PDF' : t('schools.downloadRequirements')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPdf}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  {showPdf && (
                    <div className="border rounded-lg overflow-hidden bg-muted/30">
                      <iframe
                        src={school.requirements_pdf_url}
                        className="w-full h-[400px]"
                        title="School Requirements PDF"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-3 bg-muted/50 rounded-lg">
                  {t('schools.noRequirements')}
                </p>
              )}
            </div>

            {/* Apply Button */}
            <Button className="w-full" size="lg" onClick={() => { setDetailsOpen(false); handleApply(); }}>
              {user ? t('schools.applyNow') : t('schools.loginToApply')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
