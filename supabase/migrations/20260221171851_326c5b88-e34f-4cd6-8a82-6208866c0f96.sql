
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  dob TEXT DEFAULT '',
  gender TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  provider TEXT DEFAULT '',
  provider_specialty TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  conditions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- Helper function (now that profiles exists)
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

-- Screening sessions table
CREATE TABLE public.screening_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  overall_risk TEXT NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.screening_sessions FOR SELECT USING (profile_id = public.get_user_profile_id());
CREATE POLICY "Users can insert own sessions" ON public.screening_sessions FOR INSERT WITH CHECK (profile_id = public.get_user_profile_id());
CREATE POLICY "Users can delete own sessions" ON public.screening_sessions FOR DELETE USING (profile_id = public.get_user_profile_id());

-- Session symptoms
CREATE TABLE public.session_symptoms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_session_id UUID NOT NULL REFERENCES public.screening_sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own symptoms" ON public.session_symptoms FOR SELECT USING (
  screening_session_id IN (SELECT id FROM public.screening_sessions WHERE profile_id = public.get_user_profile_id())
);
CREATE POLICY "Users can insert own symptoms" ON public.session_symptoms FOR INSERT WITH CHECK (
  screening_session_id IN (SELECT id FROM public.screening_sessions WHERE profile_id = public.get_user_profile_id())
);

-- Session insights
CREATE TABLE public.session_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  screening_session_id UUID NOT NULL REFERENCES public.screening_sessions(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'low',
  description TEXT NOT NULL DEFAULT '',
  suggestion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON public.session_insights FOR SELECT USING (
  screening_session_id IN (SELECT id FROM public.screening_sessions WHERE profile_id = public.get_user_profile_id())
);
CREATE POLICY "Users can insert own insights" ON public.session_insights FOR INSERT WITH CHECK (
  screening_session_id IN (SELECT id FROM public.screening_sessions WHERE profile_id = public.get_user_profile_id())
);

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
