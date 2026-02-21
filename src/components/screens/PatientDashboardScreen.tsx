import { motion } from 'framer-motion';
import {
  User, Stethoscope, History, RotateCcw, Calendar, MapPin,
  AlertTriangle, CheckCircle2, Activity, ChevronRight,
  Pill, Heart, Phone, Mail, Shield, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PatientProfile, ScreeningSession, HealthInsight } from '@/lib/screening-types';

interface PatientDashboardScreenProps {
  profile: PatientProfile;
  sessions: ScreeningSession[];
  insights: HealthInsight[];
  overallRisk: 'low' | 'moderate' | 'high';
  onNewScan: () => void;
  onHistory: () => void;
  onEditProfile: () => void;
  onAddProvider: () => void;
  onSignOut?: () => void;
}

const riskConfig = {
  low: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', icon: CheckCircle2, label: 'Low Risk' },
  moderate: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: AlertTriangle, label: 'Moderate' },
  high: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', icon: AlertTriangle, label: 'High Risk' },
};

// patient home dashboard with profile, insights, and recent sessions
const PatientDashboardScreen = ({
  profile,
  sessions,
  insights,
  overallRisk,
  onNewScan,
  onHistory,
  onEditProfile,
  onAddProvider,
  onSignOut,
}: PatientDashboardScreenProps) => {
  const risk = riskConfig[overallRisk];
  const RiskIcon = risk.icon;
  const hasProvider = Boolean(profile.provider);
  const initials = profile.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const recentSessions = sessions.slice(0, 3);
  const latestInsights = insights.slice(0, 3);
  const sessionCountLabel = sessions.length === 1 ? 'screening' : 'screenings';
  const welcomeMessage = sessions.length > 0
    ? `You have ${sessions.length} ${sessionCountLabel} on record.`
    : 'Your profile is all set. Start your first screening!';
  const getInsightBorder = (level: 'low' | 'moderate' | 'high') => {
    if (level === 'high') return 'border-l-destructive';
    if (level === 'moderate') return 'border-l-warning';
    return 'border-l-success';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Activity className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold font-display text-foreground">HealthScreen</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onHistory} className="gap-1.5 text-muted-foreground">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onEditProfile} className="gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </Button>
            <Button size="sm" onClick={onNewScan} className="gap-1.5 gradient-primary border-0 text-primary-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              New Scan
            </Button>
            {onSignOut && (
              <Button variant="ghost" size="sm" onClick={onSignOut} className="gap-1.5 text-muted-foreground">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Welcome hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center"
        >
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-soft">
            <AvatarFallback className="gradient-primary text-primary-foreground text-xl font-bold font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-display text-foreground">
              Welcome back, {profile.name.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">{welcomeMessage}</p>
          </div>
          {/* Risk badge */}
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${risk.bg} ${risk.border}`}>
            <RiskIcon className={`h-5 w-5 ${risk.color}`} />
            <div>
              <p className={`text-sm font-bold ${risk.color}`}>{risk.label}</p>
              <p className="text-[10px] text-muted-foreground">Current status</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: Profile + Provider */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Profile card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary" />
                  Patient Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">DOB:</span>
                  <span className="font-medium text-foreground">
                    {profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
                  </span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{profile.phone}</span>
                  </div>
                )}
                {profile.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{profile.email}</span>
                  </div>
                )}
                {profile.allergies && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-3.5 w-3.5 text-destructive" />
                      <div>
                        <span className="text-xs text-muted-foreground">Allergies</span>
                        <p className="font-medium text-foreground">{profile.allergies}</p>
                      </div>
                    </div>
                  </>
                )}
                {profile.medications && (
                  <div className="flex items-start gap-2">
                    <Pill className="mt-0.5 h-3.5 w-3.5 text-accent" />
                    <div>
                      <span className="text-xs text-muted-foreground">Medications</span>
                      <p className="font-medium text-foreground">{profile.medications}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Provider card */}
            <Card className={hasProvider ? '' : 'border-dashed border-2 border-primary/30'}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Your Provider
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile.provider ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{profile.provider}</p>
                        <p className="text-xs text-muted-foreground">{profile.providerSpecialty || 'General Practice'}</p>
                      </div>
                    </div>
                    {profile.providerLocation && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground rounded-md bg-secondary/50 px-2.5 py-1.5">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span>{profile.providerLocation}</span>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={onAddProvider} className="gap-1.5 text-primary w-full">
                      <ChevronRight className="h-3 w-3" />
                      Change Provider
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Stethoscope className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground mb-3">No provider assigned yet</p>
                    <Button variant="outline" size="sm" onClick={onAddProvider} className="gap-1.5">
                      Add Provider
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Middle + Right: Insights + History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 lg:col-span-2"
          >
            {/* Latest insights */}
            {latestInsights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-primary" />
                    Latest Health Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {latestInsights.map((insight) => {
                    const levelColor = getInsightBorder(insight.level);
                    return (
                      <div key={`${insight.category}-${insight.description}`} className={`rounded-lg border-l-4 bg-secondary/30 p-3 ${levelColor}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">{insight.category}</p>
                        <p className="text-sm text-foreground">{insight.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{insight.suggestion}</p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Recent visit history */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4 text-primary" />
                    Recent Visits
                  </CardTitle>
                  {sessions.length > 3 && (
                    <Button variant="ghost" size="sm" onClick={onHistory} className="gap-1 text-xs text-primary">
                      View All <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentSessions.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No screening visits yet</p>
                    <Button onClick={onNewScan} size="sm" className="mt-3 gap-1.5 gradient-primary border-0 text-primary-foreground">
                      Start First Screening
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSessions.map((session, i) => {
                      const badge = riskConfig[session.overallRisk];
                      const BadgeIcon = badge.icon;
                      const checkedSymptoms = session.symptoms.filter(s => s.checked);
                      return (
                        <motion.div
                          key={session.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 rounded-lg border border-border p-3"
                        >
                          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${badge.bg}`}>
                            <BadgeIcon className={`h-4 w-4 ${badge.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {new Date(session.date).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric'
                                })}
                              </span>
                              <span className={`text-xs font-medium ${badge.color}`}>{badge.label}</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {checkedSymptoms.slice(0, 4).map(s => (
                                <span key={s.id} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                                  {s.label}
                                </span>
                              ))}
                              {checkedSymptoms.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{checkedSymptoms.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="flex gap-3">
              <Button
                onClick={onNewScan}
                size="lg"
                className="flex-1 gap-2 rounded-xl py-6 gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="h-4 w-4" />
                New Screening
              </Button>
              <Button
                onClick={onHistory}
                size="lg"
                variant="outline"
                className="flex-1 gap-2 rounded-xl py-6"
              >
                <History className="h-4 w-4" />
                Full History
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboardScreen;
