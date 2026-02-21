# 🚀 Frontend Quick Start Guide

## Prerequisites
- Node.js installed ✓
- Python backend running (optional, for full functionality)

## Step 1: Install Dependencies

```powershell
npm install
```

This will install all required packages (React, Vite, shadcn/ui, etc.)

## Step 2: Start the Development Server

```powershell
npm run dev
```

This will start the Vite development server, usually at `http://localhost:5173`

## Step 3: Open in Browser

The terminal will show you the URL (typically):
- Local: `http://localhost:5173`
- Network: `http://192.168.x.x:5173`

## 🔗 Connect to Python Backend

To use the Python backend instead of Supabase functions:

1. Make sure the Python backend is running:
   ```powershell
   cd supabase/functions
   python dev_server.py
   ```

2. The Python backend will be at `http://localhost:8000`

3. Update your frontend API calls to use the new endpoints

## 📋 Available Scripts

```powershell
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors
**Solution**: Delete `node_modules` and reinstall
```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue: Port 5173 already in use
**Solution**: Kill the process or use a different port
```powershell
# Kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use a different port
npm run dev -- --port 3000
```

### Issue: Python backend not connecting
**Solution**: Check if backend is running
```powershell
curl http://localhost:8000/analyze-insights
```

## 🎯 Full Stack Development

Run both frontend and backend together:

### Terminal 1 (Backend):
```powershell
cd supabase/functions
python dev_server.py
```

### Terminal 2 (Frontend):
```powershell
npm run dev
```

Now you have:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:8000`

## 🌐 Environment Variables

Make sure your `.env` file has:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
AZURE_AGENT_KEY=your_key
AZURE_AGENT_ENDPOINT=your_endpoint
AZURE_MAPS_KEY=your_key
AZURE_WHISPER_API_KEY=your_key
```

---

**Ready to develop!** 🎉
