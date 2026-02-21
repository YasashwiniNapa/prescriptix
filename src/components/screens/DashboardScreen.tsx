import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, ArrowRight, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HealthInsight } from '@/lib/screening-types';

interface DashboardScreenProps {
  insights: HealthInsight[];
  overallRisk: 'low' | 'moderate' | 'high';
  onHistory: () => void;
  onNewScan: () => void;
}

const riskConfig = {
  low: { color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2, label: 'Low Risk' },
  moderate: { color: 'text-warning', bg: 'bg-warning/10', icon: AlertTriangle, label: 'Moderate' },
  high: { color: 'text-destructive', bg: 'bg-destructive/10', icon: AlertTriangle, label: 'High Risk' },
};

const levelColors = {
  low: 'border-l-success',
  moderate: 'border-l-warning',
  high: 'border-l-destructive',
};

// summary view for insights and next actions
const DashboardScreen = ({ insights, overallRisk, onHistory, onNewScan }: DashboardScreenProps) => {
  const risk = riskConfig[overallRisk];
  const RiskIcon = risk.icon;

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Health Summary</h2>
        <p className="mb-8 text-muted-foreground">Based on your screening and intake data.</p>

        {/* Overall risk */}
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className={`mb-8 flex items-center gap-4 rounded-2xl ${risk.bg} p-5`}
        >
          <RiskIcon className={`h-8 w-8 ${risk.color}`} />
          <div>
            <p className={`text-lg font-bold font-display ${risk.color}`}>{risk.label}</p>
            <p className="text-sm text-muted-foreground">Overall assessment</p>
          </div>
        </motion.div>

        {/* Insights */}
        <div className="mb-8 space-y-4">
          {insights.map((insight, i) => (
            <motion.div
              key={`${insight.category}-${insight.description}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border-l-4 bg-card p-5 shadow-card ${levelColors[insight.level]}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  {insight.category}
                </span>
              </div>
              <p className="mb-2 text-sm font-medium text-foreground">{insight.description}</p>
              <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-secondary-foreground" />
                <p className="text-xs text-secondary-foreground">{insight.suggestion}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onNewScan}
            size="lg"
            className="flex-1 gap-2 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="h-4 w-4" />
            New Scan
          </Button>
          <Button
            onClick={onHistory}
            size="lg"
            variant="outline"
            className="flex-1 gap-2 rounded-xl py-6"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardScreen;
