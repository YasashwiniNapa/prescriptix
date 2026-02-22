# Team Andy

**Team Members:**
- Disha Patel
- Avani Jagdale  
- Yash Napa
- Nijaa Nishanth

# health screening ai

ai-powered health screening app using facial analysis, voice input, and real-time symptom detection.

## tech stack

- react + typescript + vite
- supabase (auth, database, edge functions)
- mediapipe (facial landmark detection)
- azure openai (whisper transcription, advisory agent)
- tailwind css + shadcn-ui

## prerequisites

- node.js (v18+) - [install with nvm](https://github.com/nvm-sh/nvm)
- docker desktop (for local supabase) - [install here](https://docs.docker.com/desktop)
- supabase cli - installed via homebrew

## how to run

### 1. install dependencies

```bash
npm install
```

### 2. start the frontend

```bash
npm run dev
```

this starts the vite dev server at `http://localhost:5173`

### 3. run supabase locally (optional)

if you want to test edge functions locally:

```bash
# make sure docker desktop is running first
supabase start

# in another terminal, serve the edge functions
supabase functions serve --env-file ./supabase/.env.local
```

edge functions will be available at `http://localhost:54321/functions/v1/`

### 4. test an edge function (example)

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/nearby-hospitals' \
  --header 'Content-Type: application/json' \
  --data '{"lat":37.7749,"lon":-122.4194,"categoryFilter":"all"}'
```

## project structure

- `/src/components/screens/` - main ui screens (auth, camera, visual screening, etc.)
- `/src/lib/` - core logic (landmark detection, sclera analysis, feature engineering, risk scoring)
- `/supabase/functions/` - edge functions (transcribe, analyze-insights, nearby-hospitals)
- `/supabase/migrations/` - database schema

## features

- facial landmark detection (468 points via mediapipe)
- sclera analysis for jaundice detection
- voice-to-text symptom capture (azure whisper)
- ai-powered health advisory (azure openai agent)
- nearby hospital/clinic search (azure maps)
- real-time risk scoring and symmetry analysis
