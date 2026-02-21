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
  /** CIE L*a*b* b-channel yellowness score (0 = neutral, higher = yellow) */
  scleraYellowness?: number;
  /** Blue chromaticity B/(R+G+B) — lower means more yellow */
  blueChromaticity?: number;
  /** Whether clinical yellowness threshold was exceeded */
  yellownessDetected?: boolean;
  /** Left vs right eye yellowness */
  leftEyeYellowness?: number;
  rightEyeYellowness?: number;
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
  providerLocation: string;
  allergies: string;
  medications: string;
  conditions: string[];
}

// app step names for the main screen flow state machine
export type AppStep = 
  | 'welcome'
  | 'camera'
  | 'screening'
  | 'results'
  | 'nearby-hospitals'
  | 'voice-input'
  | 'intake'
  | 'processing'
  | 'advisory'
  | 'profile-setup'
  | 'add-provider'
  | 'patient-dashboard'
  | 'dashboard'
  | 'history'
  | 'video-upload'
  | 'edit-profile';
