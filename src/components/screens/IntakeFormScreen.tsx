import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Smart Intake</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Health Intake Form</h2>
        <p className="mb-8 text-muted-foreground">
          Pre-filled from your screening. Adjust as needed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Symptoms</label>
            <Textarea
              value={form.symptoms}
              onChange={e => setForm(prev => ({ ...prev, symptoms: e.target.value }))}
              className="rounded-xl"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Duration</label>
            <Input
              value={form.duration}
              onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="e.g., 2 days, 1 week"
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Severity: {form.severity}/10
            </label>
            <Slider
              value={[form.severity]}
              onValueChange={([v]) => setForm(prev => ({ ...prev, severity: v }))}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Mild</span>
              <span>Severe</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Additional Notes</label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any other details…"
              className="rounded-xl"
              rows={3}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
          >
            Analyze
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default IntakeFormScreen;
