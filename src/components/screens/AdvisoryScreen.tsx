import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, Shield, Activity, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface AgentAdvisory {
  severityScore: number;
  severityTier: 'Low' | 'Moderate' | 'High';
  advisingReport: string;
}

interface AdvisoryScreenProps {
  advisory: AgentAdvisory | null;
  loading: boolean;
  error: string | null;
  onContinue: () => void;
}

const tierConfig = {
  Low: { icon: ShieldCheck, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', ring: 'ring-success/20' },
  Moderate: { icon: Shield, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', ring: 'ring-warning/20' },
  High: { icon: ShieldAlert, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', ring: 'ring-destructive/20' },
};

// renders the ai advisory or a fallback state
const AdvisoryScreen = ({ advisory, loading, error, onContinue }: AdvisoryScreenProps) => {
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-sm">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-semibold font-display text-foreground">Consulting AI Agent…</p>
          <p className="mt-1 text-sm text-muted-foreground">Analyzing your screening insights</p>
        </motion.div>
      </div>
    );
  }

  if (error || !advisory) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h2 className="text-xl font-bold font-display text-foreground mb-2">Analysis Unavailable</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error || 'Could not retrieve advisory. Your screening data has been saved.'}
          </p>
          <Button onClick={onContinue} size="lg" className="w-full rounded-xl py-6 gradient-primary border-0 text-primary-foreground">
            Continue <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const tier = tierConfig[advisory.severityTier] || tierConfig.Moderate;
  const TierIcon = tier.icon;
  const scorePercent = Math.round(advisory.severityScore * 100);
  const tierBarClasses: Record<AgentAdvisory['severityTier'], string> = {
    High: 'bg-destructive',
    Moderate: 'bg-warning',
    Low: 'bg-success',
  };
  const tierBarClass = tierBarClasses[advisory.severityTier];

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-2 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">AI Advisory</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Screening Advisory</h2>
        <p className="mb-8 text-muted-foreground text-sm">
          Your screening results have been analyzed by our AI agent.
        </p>

        {/* Severity Score + Tier */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`mb-6 border-2 ${tier.border} ring-2 ${tier.ring}`}>
            <CardContent className="flex items-center gap-5 p-6">
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl ${tier.bg}`}>
                <TierIcon className={`h-8 w-8 ${tier.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Severity Tier</p>
                <p className={`text-2xl font-bold font-display ${tier.color}`}>{advisory.severityTier}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${tierBarClass}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${scorePercent}%` }}
                      transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-sm font-bold font-mono text-foreground">{scorePercent}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advising Report */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                Advisory Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {advisory.advisingReport}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <p className="mb-6 text-center text-[10px] text-muted-foreground">
          This advisory is AI-generated and does not constitute medical advice. Always consult a qualified healthcare professional.
        </p>

        <Button
          onClick={onContinue}
          size="lg"
          className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
        >
          Continue
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
};

export default AdvisoryScreen;
