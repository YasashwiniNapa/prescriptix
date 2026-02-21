import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppStep, ScreeningResult, SymptomItem, HealthInsight, ScreeningSession, IntakeFormData } from '@/lib/screening-types';
import { resultToSymptoms, generateInsights, createSession } from '@/lib/mock-screening';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import CameraScreen from '@/components/screens/CameraScreen';
import VisualScreeningScreen from '@/components/screens/VisualScreeningScreen';
import ResultsScreen from '@/components/screens/ResultsScreen';
import IntakeFormScreen from '@/components/screens/IntakeFormScreen';
import ProcessingScreen from '@/components/screens/ProcessingScreen';
import DashboardScreen from '@/components/screens/DashboardScreen';
import HistoryScreen from '@/components/screens/HistoryScreen';

const pageVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
};

const Index = () => {
  const [step, setStep] = useState<AppStep>('welcome');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomItem[]>([]);
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [overallRisk, setOverallRisk] = useState<'low' | 'moderate' | 'high'>('low');
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);

  const handleCameraReady = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    setStep('screening');
  };

  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);

  const handleScreeningComplete = (result: ScreeningResult) => {
    // Stop camera
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    const syms = resultToSymptoms(result);
    setSymptoms(syms);
    setScreeningResult(result);
    setStep('results');
  };

  const handleResultsContinue = (updatedSymptoms: SymptomItem[]) => {
    setSymptoms(updatedSymptoms);
    setStep('intake');
  };

  const handleIntakeSubmit = (_data: IntakeFormData) => {
    setStep('processing');
  };

  const handleProcessingComplete = useCallback(() => {
    const ins = generateInsights(symptoms);
    setInsights(ins);
    const session = createSession(symptoms, ins);
    setOverallRisk(session.overallRisk);
    setSessions(prev => [session, ...prev]);
    setStep('dashboard');
  }, [symptoms]);

  const handleNewScan = () => {
    setStep('welcome');
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        {step === 'welcome' && <WelcomeScreen onStart={() => setStep('camera')} />}
        {step === 'camera' && <CameraScreen onCameraReady={handleCameraReady} />}
        {step === 'screening' && stream && (
          <VisualScreeningScreen stream={stream} onComplete={handleScreeningComplete} />
        )}
        {step === 'results' && <ResultsScreen symptoms={symptoms} onContinue={handleResultsContinue} />}
        {step === 'intake' && <IntakeFormScreen symptoms={symptoms} screeningResult={screeningResult} onSubmit={handleIntakeSubmit} />}
        {step === 'processing' && <ProcessingScreen onComplete={handleProcessingComplete} />}
        {step === 'dashboard' && (
          <DashboardScreen
            insights={insights}
            overallRisk={overallRisk}
            onHistory={() => setStep('history')}
            onNewScan={handleNewScan}
          />
        )}
        {step === 'history' && <HistoryScreen sessions={sessions} onBack={() => setStep('dashboard')} />}
      </motion.div>
    </AnimatePresence>
  );
};

export default Index;
