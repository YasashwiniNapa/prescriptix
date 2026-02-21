import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScreeningSession } from '@/lib/screening-types';

interface HistoryScreenProps {
  sessions: ScreeningSession[];
  onBack: () => void;
}

const riskBadge = {
  low: { className: 'bg-success/10 text-success', icon: CheckCircle2 },
  moderate: { className: 'bg-warning/10 text-warning', icon: AlertTriangle },
  high: { className: 'bg-destructive/10 text-destructive', icon: AlertTriangle },
};

// timeline of previous screening sessions
const HistoryScreen = ({ sessions, onBack }: HistoryScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-md"
      >
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Screening History</h2>
        <p className="mb-8 text-muted-foreground">Your past screening sessions.</p>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card p-12 text-center shadow-card">
            <Calendar className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">No screenings yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => {
              const badge = riskBadge[session.overallRisk];
              const BadgeIcon = badge.icon;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl bg-card p-5 shadow-card"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                      <BadgeIcon className="h-3 w-3" />
                      {session.overallRisk}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {session.symptoms.filter(s => s.checked).map(s => (
                      <span key={s.id} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {s.label}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HistoryScreen;
