import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SymptomItem } from '@/lib/screening-types';

interface ResultsScreenProps {
  symptoms: SymptomItem[];
  onContinue: (symptoms: SymptomItem[]) => void;
}

// lets users confirm, remove, or add symptoms
const ResultsScreen = ({ symptoms: initialSymptoms, onContinue }: ResultsScreenProps) => {
  const [symptoms, setSymptoms] = useState<SymptomItem[]>(initialSymptoms);
  const [newSymptom, setNewSymptom] = useState('');

  const toggle = (id: string) => {
    setSymptoms(prev => prev.map(s => s.id === id ? { ...s, checked: !s.checked } : s));
  };

  const remove = (id: string) => {
    setSymptoms(prev => prev.filter(s => s.id !== id));
  };

  const addSymptom = () => {
    if (!newSymptom.trim()) return;
    setSymptoms(prev => [
      ...prev,
      { id: Date.now().toString(), label: newSymptom.trim(), checked: true, source: 'user' },
    ]);
    setNewSymptom('');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">AI Screening Complete</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Review Indicators</h2>
        <p className="mb-8 text-muted-foreground">
          We noticed possible indicators. Please confirm or adjust.
        </p>

        {/* Symptoms list */}
        <div className="mb-6 space-y-3">
          {symptoms.map((symptom, i) => (
            <motion.div
              key={symptom.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card"
            >
              <button
                onClick={() => toggle(symptom.id)}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  symptom.checked
                    ? 'border-primary bg-primary'
                    : 'border-border bg-background'
                }`}
              >
                {symptom.checked && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
              </button>
              <span className={`flex-1 text-sm font-medium ${symptom.checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                {symptom.label}
              </span>
              {symptom.source === 'ai' && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                  AI
                </span>
              )}
              <button onClick={() => remove(symptom.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>

        {/* Add symptom */}
        <div className="mb-8 flex gap-2">
          <Input
            value={newSymptom}
            onChange={e => setNewSymptom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSymptom()}
            placeholder="Add another symptom…"
            className="rounded-xl"
          />
          <Button onClick={addSymptom} size="icon" variant="outline" className="shrink-0 rounded-xl">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={() => onContinue(symptoms)}
          size="lg"
          className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
        >
          Continue
        </Button>
      </motion.div>
    </div>
  );
};

export default ResultsScreen;
