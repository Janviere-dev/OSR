import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SchoolCard } from '@/components/SchoolCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { provinces, getDistrictsForProvince, getSectorsForDistrict } from '@/data/rwanda-locations';
import { Search, Loader2 } from 'lucide-react';

interface School {
  id: string;
  name: string;
  logo_url: string | null;
  province: string;
  district: string;
  sector: string;
  requirements_pdf_url?: string | null;
  description?: string | null;
  showcase_image_url?: string | null;
}

export function SchoolDiscovery() {
  const { t } = useLanguage();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('');

  const availableDistricts = selectedProvince ? getDistrictsForProvince(selectedProvince) : [];
  const availableSectors = selectedDistrict ? getSectorsForDistrict(selectedDistrict) : [];

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, logo_url, province, district, sector, requirements_pdf_url, description, showcase_image_url')
      .eq('is_approved', true);

    if (error) {
      console.error('Error fetching schools:', error);
    } else {
      setSchools(data || []);
    }
    setLoading(false);
  };

  const filteredSchools = schools.filter((school) => {
    const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvince = !selectedProvince || school.province === selectedProvince;
    const matchesDistrict = !selectedDistrict || school.district === selectedDistrict;
    const matchesSector = !selectedSector || school.sector === selectedSector;

    return matchesSearch && matchesProvince && matchesDistrict && matchesSector;
  });

  const handleProvinceChange = (value: string) => {
    setSelectedProvince(value === 'all' ? '' : value);
    setSelectedDistrict('');
    setSelectedSector('');
  };

  const handleDistrictChange = (value: string) => {
    setSelectedDistrict(value === 'all' ? '' : value);
    setSelectedSector('');
  };

  const handleSectorChange = (value: string) => {
    setSelectedSector(value === 'all' ? '' : value);
  };

  return (
    <section id="schools" className="section-padding bg-secondary/30">
      <div className="container-osr">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t('schools.title')}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('schools.subtitle')}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card p-6 rounded-xl border border-border/50 shadow-card mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('schools.filter.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-focus"
              />
            </div>

            {/* Province */}
            <Select value={selectedProvince || 'all'} onValueChange={handleProvinceChange}>
              <SelectTrigger className="input-focus">
                <SelectValue placeholder={t('schools.filter.province')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Provinces</SelectItem>
                {provinces.map((province) => (
                  <SelectItem key={province} value={province}>
                    {province}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* District */}
            <Select
              value={selectedDistrict || 'all'}
              onValueChange={handleDistrictChange}
              disabled={!selectedProvince}
            >
              <SelectTrigger className="input-focus">
                <SelectValue placeholder={t('schools.filter.district')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {availableDistricts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sector */}
            <Select
              value={selectedSector || 'all'}
              onValueChange={handleSectorChange}
              disabled={!selectedDistrict}
            >
              <SelectTrigger className="input-focus">
                <SelectValue placeholder={t('schools.filter.sector')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sectors</SelectItem>
                {availableSectors.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredSchools.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredSchools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">
              No schools found matching your criteria. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
