import { supabase } from '@/integrations/supabase/client';
import { PatientProfile, ScreeningSession, SymptomItem, HealthInsight } from './screening-types';

// load the current user's profile row into the ui shape
export async function loadProfile(): Promise<PatientProfile | null> {
  const { data } = await supabase.from('profiles').select('*').maybeSingle();
  if (!data) return null;
  return {
    name: data.name,
    dob: data.dob || '',
    gender: data.gender || '',
    email: data.email || '',
    phone: data.phone || '',
    provider: data.provider || '',
    providerSpecialty: data.provider_specialty || '',
    providerLocation: (data as any).provider_location || '',
    allergies: data.allergies || '',
    medications: data.medications || '',
    conditions: data.conditions || [],
  };
}

export async function saveProfile(profile: PatientProfile, userId: string): Promise<string> {
  const row: any = {
    user_id: userId,
    name: profile.name,
    dob: profile.dob,
    gender: profile.gender,
    email: profile.email,
    phone: profile.phone,
    provider: profile.provider,
    provider_specialty: profile.providerSpecialty,
    provider_location: profile.providerLocation,
    allergies: profile.allergies,
    medications: profile.medications,
    conditions: profile.conditions,
  };

  // Upsert by user_id
  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

export async function getProfileId(): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').maybeSingle();
  return data?.id ?? null;
}

// persists a session plus its symptoms and insights
export async function saveSession(
  profileId: string,
  symptoms: SymptomItem[],
  insights: HealthInsight[],
  overallRisk: string
): Promise<string> {
  const { data: session, error: sessionErr } = await supabase
    .from('screening_sessions')
    .insert({ profile_id: profileId, overall_risk: overallRisk })
    .select('id')
    .single();

  if (sessionErr) throw sessionErr;

  const sessionId = session.id;

  // Insert symptoms
  if (symptoms.length > 0) {
    const symptomRows = symptoms.map(s => ({
      screening_session_id: sessionId,
      label: s.label,
      checked: s.checked,
      source: s.source,
    }));
    await supabase.from('session_symptoms').insert(symptomRows);
  }

  // Insert insights
  if (insights.length > 0) {
    const insightRows = insights.map(i => ({
      screening_session_id: sessionId,
      category: i.category,
      level: i.level,
      description: i.description,
      suggestion: i.suggestion,
    }));
    await supabase.from('session_insights').insert(insightRows);
  }

  return sessionId;
}

export async function loadSessions(): Promise<ScreeningSession[]> {
  const { data: sessions } = await supabase
    .from('screening_sessions')
    .select('id, created_at, overall_risk')
    .order('created_at', { ascending: false });

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);

  const [{ data: symptoms }, { data: insights }] = await Promise.all([
    supabase.from('session_symptoms').select('*').in('screening_session_id', sessionIds),
    supabase.from('session_insights').select('*').in('screening_session_id', sessionIds),
  ]);

  return sessions.map(s => ({
    id: s.id,
    date: s.created_at,
    overallRisk: s.overall_risk as 'low' | 'moderate' | 'high',
    symptoms: (symptoms || [])
      .filter(sym => sym.screening_session_id === s.id)
      .map(sym => ({ id: sym.id, label: sym.label, checked: sym.checked, source: sym.source as 'ai' | 'user' })),
    insights: (insights || [])
      .filter(ins => ins.screening_session_id === s.id)
      .map(ins => ({ category: ins.category, level: ins.level as 'low' | 'moderate' | 'high', description: ins.description, suggestion: ins.suggestion })),
  }));
}
