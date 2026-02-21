export interface ScreeningResult {
  droopyEyes: boolean;
  fatigueScore: number;
  feverRisk: number;
  asymmetryScore: number;
  blinkRate: number;
  earLeft: number;
  earRight: number;
  eyelidOpeningLeft: number;
  eyelidOpeningRight: number;
  swellingDetected: boolean;
}

export interface SymptomItem {
  id: string;
  label: string;
  checked: boolean;
  source: 'ai' | 'user';
}

export interface IntakeFormData {
  symptoms: string;
  duration: string;
  severity: number;
  notes: string;
  voiceTranscript?: string;
}

export interface HealthInsight {
  category: string;
  level: 'low' | 'moderate' | 'high';
  description: string;
  suggestion: string;
}

export interface ScreeningSession {
  id: string;
  date: string;
  symptoms: SymptomItem[];
  insights: HealthInsight[];
  overallRisk: 'low' | 'moderate' | 'high';
}

export type AppStep = 
  | 'welcome'
  | 'camera'
  | 'screening'
  | 'results'
  | 'voice-input'
  | 'intake'
  | 'processing'
  | 'dashboard'
  | 'history';
