import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppStep, ScreeningResult, SymptomItem, HealthInsight, ScreeningSession, IntakeFormData, PatientProfile } from '@/lib/screening-types';
import { resultToSymptoms, generateInsights, createSession } from '@/lib/mock-screening';
import { loadProfile, saveProfile, getProfileId, saveSession, loadSessions } from '@/lib/db-helpers';
import { useAuth } from '@/hooks/useAuth';
import AuthScreen from '@/components/screens/AuthScreen';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import CameraScreen from '@/components/screens/CameraScreen';
import VisualScreeningScreen from '@/components/screens/VisualScreeningScreen';
import ResultsScreen from '@/components/screens/ResultsScreen';
import NearbyHospitalsScreen from '@/components/screens/NearbyHospitalsScreen';
import VoiceInputScreen from '@/components/screens/VoiceInputScreen';
import VideoUploadScanScreen from '@/components/screens/VideoUploadScanScreen';
import IntakeFormScreen from '@/components/screens/IntakeFormScreen';
import ProcessingScreen from '@/components/screens/ProcessingScreen';
import DashboardScreen from '@/components/screens/DashboardScreen';
import HistoryScreen from '@/components/screens/HistoryScreen';
import ProfileSetupScreen from '@/components/screens/ProfileSetupScreen';
import PatientDashboardScreen from '@/components/screens/PatientDashboardScreen';
import AddProviderScreen from '@/components/screens/AddProviderScreen';
import AdvisoryScreen, { AgentAdvisory } from '@/components/screens/AdvisoryScreen';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

// main app flow controller and screen router
const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [step, setStep] = useState<AppStep | 'auth' | 'loading'>('loading');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [overallRisk, setOverallRisk] = useState<'low' | 'moderate' | 'high'>('low');
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [intakeData, setIntakeData] = useState<IntakeFormData | null>(null);
  const [advisory, setAdvisory] = useState<AgentAdvisory | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);

  // on auth change, hydrate profile + sessions and pick the starting step
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStep('auth');
      return;
    }
    // Load profile + sessions
    const init = async () => {
      setStep('loading');
      try {
        const [p, s] = await Promise.all([loadProfile(), loadSessions()]);
        setProfile(p);
        setSessions(s);
        if (s.length > 0 && s[0]) {
          setOverallRisk(s[0].overallRisk);
          setInsights(s[0].insights);
        }
        // If has profile + sessions → dashboard, if has profile but no sessions → welcome for new scan, if no profile → welcome
        if (p) {
          setStep('patient-dashboard');
        } else {
          setStep('welcome');
        }
      } catch {
        setStep('welcome');
      }
    };
    init();
  }, [user, authLoading]);

  // camera stream is kept to feed the live screening screen
  const handleCameraReady = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setStep('screening');
  };

  const handleScreeningComplete = (result: ScreeningResult) => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    const syms = resultToSymptoms(result);
    setSymptoms(syms);
    setScreeningResult(result);
    setStep('results');
  };

  const handleResultsContinue = (updatedSymptoms: SymptomItem[]) => {
    setSymptoms(updatedSymptoms);
    setStep('voice-input');
  };

  const handleVoiceComplete = (transcript: string) => {
    setVoiceTranscript(transcript);
    setStep('intake');
  };

  const handleVoiceSkip = () => {
    setVoiceTranscript('');
    setStep('intake');
  };

  const handleIntakeSubmit = (data: IntakeFormData) => {
    setIntakeData(data);
    setStep('processing');
  };

  // derive insights, persist session, then request the advisory agent
  const handleProcessingComplete = useCallback(async () => {
    const ins = generateInsights(symptoms);
    setInsights(ins);
    const session = createSession(symptoms, ins);
    setOverallRisk(session.overallRisk);

    // Save to DB if user is logged in
    if (user) {
      try {
        let profileId = await getProfileId();
        if (profileId) {
          await saveSession(profileId, symptoms, ins, session.overallRisk);
          const updatedSessions = await loadSessions();
          setSessions(updatedSessions);
        } else {
          setSessions(prev => [session, ...prev]);
        }
      } catch {
        setSessions(prev => [session, ...prev]);
      }
    } else {
      setSessions(prev => [session, ...prev]);
    }

    // Go to advisory screen and call Azure Agent
    setAdvisory(null);
    setAdvisoryError(null);
    setAdvisoryLoading(true);
    setStep('advisory');

    try {
      const { data, error } = await supabase.functions.invoke('analyze-insights', {
        body: { insights: ins },
      });
      if (error) throw error;
      setAdvisory(data as AgentAdvisory);
      // Use agent's severity to override risk for hospital routing
      if (data?.severityTier) {
        const tierMap: Record<string, 'low' | 'moderate' | 'high'> = {
          Low: 'low', Moderate: 'moderate', High: 'high',
        };
        setOverallRisk(tierMap[data.severityTier] || session.overallRisk);
      }
    } catch (err) {
      console.error('Azure Agent error:', err);
      setAdvisoryError('Could not reach the advisory agent. You can still continue.');
    } finally {
      setAdvisoryLoading(false);
    }
  }, [symptoms, profile, user]);

  const handleHospitalsContinue = () => {
    if (profile) {
      setStep('patient-dashboard');
      return;
    }
    setStep('profile-setup');
  };

  const handleProfileComplete = async (newProfile: PatientProfile) => {
    setProfile(newProfile);
    if (user) {
      try {
        const profileId = await saveProfile(newProfile, user.id);
        // If we have pending local sessions that aren't saved yet, save them
        if (symptoms.length > 0) {
          await saveSession(profileId, symptoms, insights, overallRisk);
          const updatedSessions = await loadSessions();
          setSessions(updatedSessions);
        }
      } catch (err) {
        console.error('Failed to save profile:', err);
      }
    }
    setStep('patient-dashboard');
  };

  const handleAddProviderSave = async (providerName: string, providerSpecialty: string, providerLocation: string) => {
    if (profile) {
      const updatedProfile = { ...profile, provider: providerName, providerSpecialty, providerLocation };
      setProfile(updatedProfile);
      if (user) {
        try {
          await saveProfile(updatedProfile, user.id);
        } catch (err) {
          console.error('Failed to save provider:', err);
        }
      }
    }
    setStep('patient-dashboard');
  };

  const handleNewScan = () => {
    setStep('welcome');
  };

  const handleSignOut = async () => {
    await signOut();
    setProfile(null);
    setSessions([]);
    setStep('auth');
  };

  if (step === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'auth') {
    return <AuthScreen onAuth={() => {}} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        {step === 'welcome' && (
          <WelcomeScreen 
            onStart={() => setStep('camera')} 
            onVideoUpload={() => setStep('video-upload')}
            onBack={profile ? () => setStep('patient-dashboard') : undefined}
          />
        )}
        {step === 'video-upload' && <VideoUploadScanScreen onBack={() => setStep('welcome')} />}
        {step === 'camera' && <CameraScreen onCameraReady={handleCameraReady} />}
        {step === 'screening' && stream && (
          <VisualScreeningScreen stream={stream} onComplete={handleScreeningComplete} />
        )}
        {step === 'results' && <ResultsScreen symptoms={symptoms} onContinue={handleResultsContinue} />}
        {step === 'voice-input' && (
          <VoiceInputScreen onComplete={handleVoiceComplete} onSkip={handleVoiceSkip} />
        )}
        {step === 'intake' && (
          <IntakeFormScreen
            symptoms={symptoms}
            screeningResult={screeningResult}
            voiceTranscript={voiceTranscript}
            onSubmit={handleIntakeSubmit}
          />
        )}
        {step === 'processing' && <ProcessingScreen onComplete={handleProcessingComplete} />}
        {step === 'advisory' && (
          <AdvisoryScreen
            advisory={advisory}
            loading={advisoryLoading}
            error={advisoryError}
            onContinue={() => setStep('nearby-hospitals')}
          />
        )}
        {step === 'nearby-hospitals' && (
          <NearbyHospitalsScreen
            onContinue={handleHospitalsContinue}
            onSkip={handleHospitalsContinue}
            overallRisk={overallRisk}
          />
        )}
        {step === 'profile-setup' && (
        <ProfileSetupScreen
            prefillName={intakeData?.patientName || user?.user_metadata?.full_name}
            prefillEmail={user?.email}
            prefillDob={intakeData?.patientDob}
            prefillGender={intakeData?.patientGender}
            prefillAllergies={intakeData?.patientAllergies}
            prefillMedications={intakeData?.patientMedications}
            prefillConditions={intakeData?.patientConditions}
            onComplete={handleProfileComplete}
          />
        )}
        {step === 'patient-dashboard' && profile && (
          <PatientDashboardScreen
            profile={profile}
            sessions={sessions}
            insights={insights}
            overallRisk={overallRisk}
            onNewScan={handleNewScan}
            onHistory={() => setStep('history')}
            onEditProfile={() => setStep('edit-profile')}
            onAddProvider={() => setStep('add-provider')}
            onSignOut={handleSignOut}
          />
        )}
        {step === 'add-provider' && (
          <AddProviderScreen
            currentProvider={profile?.provider}
            currentSpecialty={profile?.providerSpecialty}
            currentLocation={profile?.providerLocation}
            onSave={handleAddProviderSave}
            onBack={() => setStep('patient-dashboard')}
          />
        )}
        {step === 'edit-profile' && profile && (
          <ProfileSetupScreen
            editMode
            existingProfile={profile}
            onComplete={async (updatedProfile) => {
              setProfile(updatedProfile);
              if (user) {
                try {
                  await saveProfile(updatedProfile, user.id);
                } catch (err) {
                  console.error('Failed to update profile:', err);
                }
              }
              setStep('patient-dashboard');
            }}
            onBack={() => setStep('patient-dashboard')}
          />
        )}
        {step === 'dashboard' && (
          <DashboardScreen
            insights={insights}
            overallRisk={overallRisk}
            onHistory={() => setStep('history')}
            onNewScan={handleNewScan}
          />
        )}
        {step === 'history' && (
          <HistoryScreen
            sessions={sessions}
            onBack={() => setStep(profile ? 'patient-dashboard' : 'dashboard')}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Index;
