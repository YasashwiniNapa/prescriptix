import { ScreeningResult, SymptomItem, HealthInsight, ScreeningSession } from './screening-types';

export function generateMockScreeningResult(): ScreeningResult {
  return {
    droopyEyes: Math.random() > 0.5,
    fatigueScore: parseFloat((0.4 + Math.random() * 0.5).toFixed(2)),
    feverRisk: parseFloat((0.1 + Math.random() * 0.6).toFixed(2)),
    asymmetryScore: parseFloat((Math.random() * 0.3).toFixed(2)),
    blinkRate: Math.floor(10 + Math.random() * 15),
  };
}

export function resultToSymptoms(result: ScreeningResult): SymptomItem[] {
  const symptoms: SymptomItem[] = [];
  
  if (result.fatigueScore > 0.5) {
    symptoms.push({ id: '1', label: 'Fatigue', checked: true, source: 'ai' });
  }
  if (result.droopyEyes) {
    symptoms.push({ id: '2', label: 'Eye strain', checked: true, source: 'ai' });
  }
  if (result.feverRisk > 0.4) {
    symptoms.push({ id: '3', label: 'Fever symptoms', checked: false, source: 'ai' });
  }
  if (result.asymmetryScore > 0.15) {
    symptoms.push({ id: '4', label: 'Facial asymmetry', checked: false, source: 'ai' });
  }
  if (result.blinkRate < 12) {
    symptoms.push({ id: '5', label: 'Dry eyes', checked: true, source: 'ai' });
  }
  
  symptoms.push({ id: '6', label: 'Headache', checked: false, source: 'ai' });
  
  return symptoms;
}

export function generateInsights(symptoms: SymptomItem[]): HealthInsight[] {
  const checked = symptoms.filter(s => s.checked);
  const insights: HealthInsight[] = [];

  if (checked.some(s => s.label === 'Fatigue')) {
    insights.push({
      category: 'Energy',
      level: 'moderate',
      description: 'Fatigue indicators detected from facial analysis',
      suggestion: 'Consider improving sleep hygiene and take regular breaks during work.',
    });
  }
  if (checked.some(s => s.label === 'Eye strain' || s.label === 'Dry eyes')) {
    insights.push({
      category: 'Vision',
      level: 'low',
      description: 'Signs of eye strain or dryness observed',
      suggestion: 'Follow the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.',
    });
  }
  if (checked.some(s => s.label === 'Fever symptoms')) {
    insights.push({
      category: 'Temperature',
      level: 'high',
      description: 'Mild fever likelihood based on facial redness patterns',
      suggestion: 'Monitor your temperature regularly. If symptoms persist, consult a healthcare provider.',
    });
  }
  if (insights.length === 0) {
    insights.push({
      category: 'General',
      level: 'low',
      description: 'No significant health indicators detected',
      suggestion: 'Continue maintaining your current health routine.',
    });
  }

  return insights;
}

export function createSession(symptoms: SymptomItem[], insights: HealthInsight[]): ScreeningSession {
  const highCount = insights.filter(i => i.level === 'high').length;
  const modCount = insights.filter(i => i.level === 'moderate').length;
  
  return {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    symptoms,
    insights,
    overallRisk: highCount > 0 ? 'high' : modCount > 0 ? 'moderate' : 'low',
  };
}
