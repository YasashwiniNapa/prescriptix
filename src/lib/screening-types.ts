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
  patientName?: string;
  patientDob?: string;
  patientGender?: string;
  patientAllergies?: string;
  patientMedications?: string;
  patientConditions?: string[];
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

export interface PatientProfile {
  name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  provider: string;
  providerSpecialty: string;
  allergies: string;
  medications: string;
  conditions: string[];
}

export type AppStep = 
  | 'welcome'
  | 'camera'
  | 'screening'
  | 'results'
  | 'nearby-hospitals'
  | 'voice-input'
  | 'intake'
  | 'processing'
  | 'profile-setup'
  | 'patient-dashboard'
  | 'dashboard'
  | 'history'
  | 'video-upload';
