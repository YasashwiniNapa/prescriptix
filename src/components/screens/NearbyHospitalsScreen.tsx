import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Navigation, Loader2, AlertCircle, Hospital } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface NearbyHospital {
  name: string;
  address: string;
  distance: number | null;
  categories: string[];
  lat: number;
  lon: number;
  phone: string | null;
}

interface NearbyHospitalsScreenProps {
  onContinue: () => void;
  onSkip: () => void;
}

const NearbyHospitalsScreen = ({ onContinue, onSkip }: NearbyHospitalsScreenProps) => {
  const [hospitals, setHospitals] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
          const { data, error: fnError } = await supabase.functions.invoke('nearby-hospitals', {
            body: { lat, lon },
          });
          if (fnError) throw fnError;
          setHospitals(data.results || []);
        } catch (e: any) {
          console.error('Failed to fetch hospitals:', e);
          setError('Could not find nearby hospitals. Please try again later.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError('Location access denied. Please enable location services to find nearby hospitals.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const formatDistance = (meters: number | null) => {
    if (meters === null) return '';
    if (meters < 1000) return `${meters}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getCategoryColor = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('hospital')) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (lower.includes('urgent')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (lower.includes('clinic')) return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="mb-2 flex items-center gap-2">
          <Hospital className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Nearby Healthcare</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Hospitals Near You</h2>
        <p className="mb-6 text-muted-foreground">
          Based on your location, here are nearby healthcare facilities.
        </p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Finding nearby hospitals…</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">{error}</p>
            <Button variant="outline" onClick={onSkip} className="mt-4 rounded-xl">
              Skip & Continue
            </Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Hospital list */}
            <div className="mb-6 space-y-3">
              {hospitals.map((hospital, i) => (
                <motion.div
                  key={`${hospital.name}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="shadow-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold font-display text-foreground truncate">
                            {hospital.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{hospital.address}</span>
                          </div>
                          {hospital.phone && (
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{hospital.phone}</span>
                            </div>
                          )}
                          {hospital.categories.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {hospital.categories.slice(0, 3).map((cat) => (
                                <Badge
                                  key={cat}
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${getCategoryColor(cat)}`}
                                >
                                  {cat}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        {hospital.distance !== null && (
                          <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                            <Navigation className="h-3 w-3" />
                            {formatDistance(hospital.distance)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {hospitals.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No hospitals found nearby.
                </p>
              )}
            </div>

            <Button
              onClick={onContinue}
              size="lg"
              className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
            >
              Continue
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default NearbyHospitalsScreen;
