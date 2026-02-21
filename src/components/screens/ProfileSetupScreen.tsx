import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Stethoscope, Heart, ChevronRight, MapPin, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientProfile } from '@/lib/screening-types';
import { supabase } from '@/integrations/supabase/client';

interface NearbyProvider {
  name: string;
  address: string;
  categories: string[];
  distance: number | null;
}

interface ProfileSetupScreenProps {
  prefillName?: string;
  prefillDob?: string;
  prefillGender?: string;
  prefillEmail?: string;
  prefillAllergies?: string;
  prefillMedications?: string;
  prefillConditions?: string[];
  editMode?: boolean;
  existingProfile?: PatientProfile;
  onComplete: (profile: PatientProfile) => void;
  onBack?: () => void;
}

/* ── Provider Step with nearby hospitals ── */
interface ProviderStepProps {
  profile: PatientProfile;
  update: (field: keyof PatientProfile, value: string) => void;
  onBack: () => void;
  onComplete: () => void;
}

// step 2 collects provider details, optionally from nearby locations
const ProviderStep = ({ profile, update, onBack, onComplete }: ProviderStepProps) => {
  const [nearbyProviders, setNearbyProviders] = useState<NearbyProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [useCustom, setUseCustom] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoadingProviders(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.functions.invoke('nearby-hospitals', {
            body: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          });
          if (!error && data?.results) setNearbyProviders(data.results);
        } catch { /* ignore */ }
        setLoadingProviders(false);
      },
      () => setLoadingProviders(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const selectProvider = (idx: number) => {
    const p = nearbyProviders[idx];
    setSelectedIdx(idx);
    setUseCustom(false);
    update('provider', p.name);
    const cat = p.categories?.[0] || '';
    update('providerSpecialty', cat);
  };

  const switchToCustom = () => {
    setSelectedIdx(null);
    setUseCustom(true);
    update('provider', '');
    update('providerSpecialty', '');
  };

  const formatDist = (m: number | null) => {
    if (m === null) return '';
    return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
  };

  const hasNearbyProviders = nearbyProviders.length > 0;
  const showNearbyList = !loadingProviders && hasNearbyProviders && !useCustom;
  const showCustomInputs = !loadingProviders && (useCustom || !hasNearbyProviders);
  const showCustomToggle = !loadingProviders && !useCustom && hasNearbyProviders;
  const showNearbyToggle = !loadingProviders && useCustom && hasNearbyProviders;

  return (
    <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="h-4 w-4 text-primary" />
            Choose a Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Nearby providers list */}
          {loadingProviders ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Finding nearby providers…</span>
            </div>
          ) : null}
          {showNearbyList && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {nearbyProviders.map((p, i) => (
                <button
                  key={`${p.name}-${p.address}`}
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
                        <p className="mt-1 text-[10px] text-muted-foreground">{p.categories.slice(0, 2).join(' · ')}</p>
                      )}
                    </div>
                    {p.distance !== null && (
                      <span className="text-xs font-medium text-primary shrink-0">{formatDist(p.distance)}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom toggle or custom inputs */}
          {showCustomToggle && (
            <Button variant="ghost" size="sm" onClick={switchToCustom} className="gap-1.5 text-primary w-full">
              <PenLine className="h-3.5 w-3.5" />
              Enter provider manually instead
            </Button>
          )}
          {showCustomInputs && (
            <div className="space-y-4">
              {showNearbyToggle && (
                <Button variant="ghost" size="sm" onClick={() => { setUseCustom(false); }} className="gap-1.5 text-primary w-full">
                  <MapPin className="h-3.5 w-3.5" />
                  Choose from nearby providers
                </Button>
              )}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Provider / Doctor Name</Label>
                <Input value={profile.provider} onChange={e => update('provider', e.target.value)} placeholder="Dr. Smith" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Specialty</Label>
                <Input value={profile.providerSpecialty} onChange={e => update('providerSpecialty', e.target.value)} placeholder="e.g., Family Medicine" className="mt-1" />
              </div>
            </div>
          )}

          {/* Allergies & Medications always visible */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Known Allergies</Label>
            <Input value={profile.allergies} onChange={e => update('allergies', e.target.value)} placeholder="e.g., Penicillin, Peanuts, None" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Current Medications</Label>
            <Input value={profile.medications} onChange={e => update('medications', e.target.value)} placeholder="e.g., Metformin 500mg" className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1 rounded-xl py-6">Back</Button>
        <Button onClick={onComplete} size="lg" className="flex-1 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity">
          Complete Profile
        </Button>
      </div>
    </motion.div>
  );
};

// step-based profile setup or edit flow
const ProfileSetupScreen = ({ prefillName, prefillDob, prefillGender, prefillEmail, prefillAllergies, prefillMedications, prefillConditions, editMode, existingProfile, onComplete, onBack }: ProfileSetupScreenProps) => {
  const [profile, setProfile] = useState<PatientProfile>(
    existingProfile
      ? { ...existingProfile }
      : {
          name: prefillName || '',
          dob: prefillDob || '',
          gender: prefillGender || '',
          email: prefillEmail || '',
          phone: '',
          provider: '',
          providerSpecialty: '',
          providerLocation: '',
          allergies: prefillAllergies || '',
          medications: prefillMedications || '',
          conditions: prefillConditions || [],
        }
  );

  const [step, setStep] = useState<1 | 2>(1);

  const update = (field: keyof PatientProfile, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const canProceed = profile.name.trim() !== '' && profile.dob !== '';
  let subtitle = 'Add your provider details.';
  if (editMode) {
    subtitle = 'Update your information below.';
  } else if (step === 1) {
    subtitle = 'Let\'s get your basic info set up.';
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-lg"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary shadow-elevated">
            <User className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            {editMode ? 'Edit Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          {/* Step indicator */}
          {!editMode && (
            <div className="mt-4 flex justify-center gap-2">
              {[1, 2].map(s => (
                <div
                  key={s}
                  className={`h-1.5 w-10 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Full Name *</Label>
                  <Input
                    value={profile.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-1"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date of Birth *</Label>
                    <Input
                      type="date"
                      value={profile.dob}
                      onChange={e => update('dob', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Phone</Label>
                    <Input
                      value={profile.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Email</Label>
                  <Input
                    type="email"
                    value={profile.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Gender</Label>
                  <RadioGroup
                    value={profile.gender}
                    onValueChange={v => update('gender', v)}
                    className="mt-2 flex gap-4"
                  >
                    {['Male', 'Female', 'Other'].map(g => (
                      <div key={g} className="flex items-center gap-2">
                        <RadioGroupItem value={g.toLowerCase()} id={`pg-${g}`} />
                        <Label htmlFor={`pg-${g}`} className="text-sm font-normal cursor-pointer">{g}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex gap-3">
              {editMode && onBack && (
                <Button variant="outline" onClick={onBack} size="lg" className="flex-1 rounded-xl py-6">
                  Cancel
                </Button>
              )}
              {editMode ? (
                <Button
                  onClick={() => onComplete(profile)}
                  disabled={!canProceed}
                  size="lg"
                  className="flex-1 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
                >
                  Save Changes
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceed}
                  size="lg"
                  className="flex-1 rounded-xl py-6 gap-2 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <ProviderStep
            profile={profile}
            update={update}
            onBack={() => setStep(1)}
            onComplete={() => onComplete(profile)}
          />
        )}
      </motion.div>
    </div>
  );
};

export default ProfileSetupScreen;
