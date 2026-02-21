import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Brain, Activity, Zap } from 'lucide-react';

interface ProcessingScreenProps {
  onComplete: () => void;
}

const steps = [
  { icon: Brain, text: 'Processing symptoms…' },
  { icon: Activity, text: 'Running health analysis…' },
  { icon: Zap, text: 'Generating insights…' },
];

const ProcessingScreen = ({ onComplete }: ProcessingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setCurrentStep(i), i * 1500)
    );
    const done = setTimeout(onComplete, steps.length * 1500 + 500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-sm text-center"
      >
        <Loader2 className="mx-auto mb-8 h-12 w-12 animate-spin text-primary" />
        
        <div className="space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const active = i <= currentStep;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: active ? 1 : 0.3, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  active ? 'gradient-primary' : 'bg-muted'
                }`}>
                  <Icon className={`h-4 w-4 ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {step.text}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default ProcessingScreen;
