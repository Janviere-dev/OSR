import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, GraduationCap, Globe } from 'lucide-react';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'rw' : 'en');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container-osr">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">OSR Rwanda</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground/80 hover:text-primary transition-colors font-medium">
              {t('nav.home')}
            </Link>
            <a href="#about" className="text-foreground/80 hover:text-primary transition-colors font-medium">
              {t('nav.about')}
            </a>
            <a href="#schools" className="text-foreground/80 hover:text-primary transition-colors font-medium">
              {t('nav.schools')}
            </a>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="flex items-center gap-1"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'RW' : 'EN'}
            </Button>

            {user ? (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/parent">{t('nav.dashboard')}</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  {t('nav.signout')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth?mode=signin">{t('nav.signin')}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth?mode=signup">{t('nav.signup')}</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <div className="flex flex-col gap-3">
              <Link
                to="/"
                className="px-3 py-2 text-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.home')}
              </Link>
              <a
                href="#about"
                className="px-3 py-2 text-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.about')}
              </a>
              <a
                href="#schools"
                className="px-3 py-2 text-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {t('nav.schools')}
              </a>
              <div className="flex items-center gap-3 px-3 pt-3 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLanguage}
                  className="flex items-center gap-1"
                >
                  <Globe className="w-4 h-4" />
                  {language === 'en' ? 'RW' : 'EN'}
                </Button>
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/parent">{t('nav.dashboard')}</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      {t('nav.signout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/auth?mode=signin">{t('nav.signin')}</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link to="/auth?mode=signup">{t('nav.signup')}</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
