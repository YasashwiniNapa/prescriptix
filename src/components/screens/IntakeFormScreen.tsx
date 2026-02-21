import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, User, Calendar, Thermometer, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SymptomItem, IntakeFormData } from '@/lib/screening-types';

interface IntakeFormScreenProps {
  symptoms: SymptomItem[];
  onSubmit: (data: IntakeFormData) => void;
}

const IntakeFormScreen = ({ symptoms, onSubmit }: IntakeFormScreenProps) => {
  const checkedSymptoms = symptoms.filter(s => s.checked).map(s => s.label).join(', ');
  const [form, setForm] = useState<IntakeFormData>({
    symptoms: checkedSymptoms,
    duration: '',
    severity: 5,
    notes: '',
  });

  const [patientInfo, setPatientInfo] = useState({
    name: '',
    dob: '',
    gender: '',
    allergies: '',
    medications: '',
    conditions: [] as string[],
  });

  const conditionOptions = [
    'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease',
    'Thyroid Disorder', 'None of the above',
  ];

  const toggleCondition = (condition: string) => {
    setPatientInfo(prev => ({
      ...prev,
      conditions: prev.conditions.includes(condition)
        ? prev.conditions.filter(c => c !== condition)
        : [...prev.conditions, condition],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-2xl"
      >
        {/* Header */}
        <div className="mb-6 border-b border-border pb-4">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Stethoscope className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">Patient Intake Form</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground">Pre-Visit Health Questionnaire</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Please complete all sections. Information pre-filled from your screening is marked below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Patient Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Section 1 — Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Full Name</Label>
                <Input
                  value={patientInfo.name}
                  onChange={e => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Last, First M."
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Date of Birth</Label>
                <Input
                  type="date"
                  value={patientInfo.dob}
                  onChange={e => setPatientInfo(prev => ({ ...prev, dob: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Gender</Label>
                <RadioGroup
                  value={patientInfo.gender}
                  onValueChange={v => setPatientInfo(prev => ({ ...prev, gender: v }))}
                  className="mt-2 flex gap-6"
                >
                  {['Male', 'Female', 'Other'].map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <RadioGroupItem value={g.toLowerCase()} id={`gender-${g}`} />
                      <Label htmlFor={`gender-${g}`} className="text-sm font-normal cursor-pointer">{g}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Chief Complaint / Symptoms */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Thermometer className="h-4 w-4 text-primary" />
                Section 2 — Chief Complaint
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Pre-filled from screening
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Primary Symptoms
                </Label>
                <Textarea
                  value={form.symptoms}
                  onChange={e => setForm(prev => ({ ...prev, symptoms: e.target.value }))}
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Duration of Symptoms</Label>
                  <Input
                    value={form.duration}
                    onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="e.g., 3 days, 1 week"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Pain / Severity Level: <span className="font-bold text-foreground">{form.severity}/10</span>
                  </Label>
                  <Slider
                    value={[form.severity]}
                    onValueChange={([v]) => setForm(prev => ({ ...prev, severity: v }))}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-3"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>1 — No pain</span>
                    <span>5 — Moderate</span>
                    <span>10 — Worst</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Medical History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Section 3 — Medical History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Known Allergies
                </Label>
                <Input
                  value={patientInfo.allergies}
                  onChange={e => setPatientInfo(prev => ({ ...prev, allergies: e.target.value }))}
                  placeholder="e.g., Penicillin, Peanuts, None"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Current Medications
                </Label>
                <Input
                  value={patientInfo.medications}
                  onChange={e => setPatientInfo(prev => ({ ...prev, medications: e.target.value }))}
                  placeholder="e.g., Metformin 500mg, Lisinopril 10mg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                  Pre-existing Conditions (check all that apply)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {conditionOptions.map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <Checkbox
                        id={`cond-${c}`}
                        checked={patientInfo.conditions.includes(c)}
                        onCheckedChange={() => toggleCondition(c)}
                      />
                      <Label htmlFor={`cond-${c}`} className="text-sm font-normal cursor-pointer">{c}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Additional Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Section 4 — Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Notes for Provider
              </Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any other details your provider should know…"
                className="mt-1"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="border-t border-border pt-4">
            <p className="mb-4 text-xs text-muted-foreground">
              By submitting, you confirm the information above is accurate to the best of your knowledge.
            </p>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
            >
              Submit &amp; Analyze
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default IntakeFormScreen;
