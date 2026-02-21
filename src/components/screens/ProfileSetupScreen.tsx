import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Stethoscope, Heart, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatientProfile } from '@/lib/screening-types';

interface ProfileSetupScreenProps {
  prefillName?: string;
  prefillDob?: string;
  prefillGender?: string;
  onComplete: (profile: PatientProfile) => void;
}

const ProfileSetupScreen = ({ prefillName, prefillDob, prefillGender, onComplete }: ProfileSetupScreenProps) => {
  const [profile, setProfile] = useState<PatientProfile>({
    name: prefillName || '',
    dob: prefillDob || '',
    gender: prefillGender || '',
    email: '',
    phone: '',
    provider: '',
    providerSpecialty: '',
    allergies: '',
    medications: '',
    conditions: [],
  });

  const [step, setStep] = useState<1 | 2>(1);

  const update = (field: keyof PatientProfile, value: string) =>
    setProfile(prev => ({ ...prev, [field]: value }));

  const canProceed = profile.name.trim() !== '' && profile.dob !== '';

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
          <h1 className="text-2xl font-bold font-display text-foreground">Create Your Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 1 ? 'Let\'s get your basic info set up.' : 'Add your provider details.'}
          </p>
          {/* Step indicator */}
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

            <Button
              onClick={() => setStep(2)}
              disabled={!canProceed}
              size="lg"
              className="mt-6 w-full gap-2 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Provider Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Provider / Doctor Name</Label>
                  <Input
                    value={profile.provider}
                    onChange={e => update('provider', e.target.value)}
                    placeholder="Dr. Smith"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Specialty</Label>
                  <Input
                    value={profile.providerSpecialty}
                    onChange={e => update('providerSpecialty', e.target.value)}
                    placeholder="e.g., Family Medicine, Internal Medicine"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Known Allergies</Label>
                  <Input
                    value={profile.allergies}
                    onChange={e => update('allergies', e.target.value)}
                    placeholder="e.g., Penicillin, Peanuts, None"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Current Medications</Label>
                  <Input
                    value={profile.medications}
                    onChange={e => update('medications', e.target.value)}
                    placeholder="e.g., Metformin 500mg"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                size="lg"
                className="flex-1 rounded-xl py-6"
              >
                Back
              </Button>
              <Button
                onClick={() => onComplete(profile)}
                size="lg"
                className="flex-1 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
              >
                Complete Profile
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileSetupScreen;
