import { useLanguage } from '@/contexts/LanguageContext';
import { ClipboardCheck, Search, BarChart3, Shield } from 'lucide-react';

const features = [
  { key: 'feature1', icon: ClipboardCheck },
  { key: 'feature2', icon: Search },
  { key: 'feature3', icon: BarChart3 },
  { key: 'feature4', icon: Shield },
];

export function AboutSection() {
  const { t } = useLanguage();

  return (
    <section id="about" className="section-padding bg-background">
      <div className="container-osr">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6 animate-fade-in">
            {t('about.title')}
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed animate-fade-in animation-delay-100">
            {t('about.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className={`p-6 rounded-xl bg-card border border-border/50 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in animation-delay-${(index + 1) * 100}`}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                  {t(`about.${feature.key}.title`)}
                </h3>
                <p className="text-muted-foreground">
                  {t(`about.${feature.key}.desc`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
