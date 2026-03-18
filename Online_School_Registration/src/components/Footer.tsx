import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-primary-foreground py-12">
      <div className="container-osr">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">OSR Rwanda</span>
            </Link>
            <p className="text-primary-foreground/70 max-w-md">
              Simplifying school registration for parents and schools across Rwanda. 
              Connecting families with quality education opportunities.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <a href="#about" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('nav.about')}
                </a>
              </li>
              <li>
                <a href="#schools" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  {t('nav.schools')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-primary-foreground/70">
                <Mail className="w-4 h-4" />
                <span>info@osr.rw</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/70">
                <Phone className="w-4 h-4" />
                <span>+250 788 000 000</span>
              </li>
              <li className="flex items-center gap-2 text-primary-foreground/70">
                <MapPin className="w-4 h-4" />
                <span>Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/60">
          <p>© {new Date().getFullYear()} OSR Rwanda. {t('footer.rights')}.</p>
        </div>
      </div>
    </footer>
  );
}
