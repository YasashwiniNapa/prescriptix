import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, MapPin, Loader2, PenLine, ChevronLeft, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface NearbyProvider {
  name: string;
  address: string;
  categories: string[];
  distance: number | null;
}

interface AddProviderScreenProps {
  currentProvider?: string;
  currentSpecialty?: string;
  currentLocation?: string;
  onSave: (provider: string, specialty: string, location: string) => void;
  onBack: () => void;
}

const AddProviderScreen = ({ currentProvider, currentSpecialty, currentLocation, onSave, onBack }: AddProviderScreenProps) => {
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [provider, setProvider] = useState(currentProvider || '');
  const [specialty, setSpecialty] = useState(currentSpecialty || '');
  const [location, setLocation] = useState(currentLocation || '');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.functions.invoke('nearby-hospitals', {
            body: { lat: pos.coords.latitude, lon: pos.coords.longitude, categoryFilter: 'clinic' },
          });
          if (!error && data?.results) setNearbyProviders(data.results);
        } catch { /* ignore */ }
        setLoading(false);
      },
      () => setLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const selectProvider = (idx: number) => {
    const p = nearbyProviders[idx];
    setSelectedIdx(idx);
    setUseCustom(false);
    setSpecialty(p.categories?.[0] || '');
    setLocation(p.name);
  };

  const switchToCustom = () => {
    setSelectedIdx(null);
    setUseCustom(true);
    setProvider('');
    setSpecialty('');
  };

  const formatDist = (m: number | null) => {
    if (m === null) return '';
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
  };

  const getCategoryBadge = (cat: string) => {
    const lower = cat.toLowerCase();
    if (/hospital/.test(lower)) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (/clinic|doctor|physician/.test(lower)) return 'bg-primary/10 text-primary border-primary/20';
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const canSave = provider.trim().length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 gap-1.5 text-muted-foreground -ml-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-2 flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Provider Setup</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Add Your Provider</h2>
        <p className="mb-6 text-muted-foreground text-sm">
          Select a facility for location, then enter your doctor's name.
        </p>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              Nearby Providers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Finding nearby providers…</span>
              </div>
            ) : nearbyProviders.length > 0 && !useCustom ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {nearbyProviders.map((p, i) => (
                  <button
                    key={`${p.name}-${i}`}
                    type="button"
                    onClick={() => selectProvider(i)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      selectedIdx === i
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border hover:border-primary/40 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </div>
                        {p.categories.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {p.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat} variant="outline" className={`text-[10px] px-1.5 py-0 ${getCategoryBadge(cat)}`}>
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {p.distance !== null && (
                        <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                          <Navigation className="h-3 w-3" />
                          {formatDist(p.distance)}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : !useCustom ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                No facilities found nearby. Enter details manually below.
              </p>
            ) : null}

            {/* Doctor name — always manual */}
            {!loading && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Doctor / Provider Name</Label>
                <Input value={provider} onChange={e => setProvider(e.target.value)} placeholder="Dr. Smith" className="mt-1" />
              </div>
            )}

            {!loading && (
              <>
                {!useCustom && nearbyProviders.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={switchToCustom} className="gap-1.5 text-primary w-full">
                    <PenLine className="h-3.5 w-3.5" />
                    Enter specialty manually instead
                  </Button>
                )}
                {(useCustom || nearbyProviders.length === 0) && (
                  <div className="space-y-4">
                    {nearbyProviders.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setUseCustom(false)} className="gap-1.5 text-primary w-full">
                        <MapPin className="h-3.5 w-3.5" />
                        Choose from nearby facilities
                      </Button>
                    )}
                    <div>
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Specialty</Label>
                      <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="e.g., Family Medicine" className="mt-1" />
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={() => onSave(provider, specialty, location)}
          disabled={!canSave}
          size="lg"
          className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          Save Provider
        </Button>
      </motion.div>
    </div>
  );
};

export default AddProviderScreen;
