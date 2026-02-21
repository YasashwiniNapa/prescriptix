import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreeningResult } from '@/lib/screening-types';
import { generateMockScreeningResult } from '@/lib/mock-screening';
import { Eye, Move, Thermometer, Activity } from 'lucide-react';

interface VisualScreeningScreenProps {
  stream: MediaStream;
  onComplete: (result: ScreeningResult) => void;
}

const SCAN_DURATION = 20000; // 20 seconds for more phases

type Phase = 'detect' | 'landmarks' | 'ear' | 'blink' | 'movement' | 'heatmap' | 'final';

const phases: { at: number; text: string; phase: Phase }[] = [
  { at: 0, text: 'Detecting face…', phase: 'detect' },
  { at: 8, text: 'Mapping facial landmarks…', phase: 'landmarks' },
  { at: 18, text: 'Measuring Eye Aspect Ratio…', phase: 'ear' },
  { at: 32, text: 'Tracking blink rate…', phase: 'blink' },
  { at: 48, text: 'Please move your face slowly…', phase: 'movement' },
  { at: 65, text: 'Scanning thermal pattern…', phase: 'heatmap' },
  { at: 85, text: 'Compiling results…', phase: 'final' },
];

const movementPrompts = [
  { instruction: 'Turn head LEFT slowly', icon: '←' },
  { instruction: 'Turn head RIGHT slowly', icon: '→' },
  { instruction: 'Tilt head UP', icon: '↑' },
  { instruction: 'Look straight ahead', icon: '○' },
];

const VisualScreeningScreen = ({ stream, onComplete }: VisualScreeningScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing…');
  const [currentPhase, setCurrentPhase] = useState<Phase>('detect');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [landmarkPoints, setLandmarkPoints] = useState<{ x: number; y: number }[]>([]);

  // EAR metrics (simulated)
  const [earLeft, setEarLeft] = useState(0);
  const [earRight, setEarRight] = useState(0);
  const [blinkCount, setBlinkCount] = useState(0);
  const [eyelidLeft, setEyelidLeft] = useState(0);
  const [eyelidRight, setEyelidRight] = useState(0);
  const [movementIndex, setMovementIndex] = useState(0);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Generate landmark dots
  useEffect(() => {
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < 68; i++) {
      const angle = (i / 68) * Math.PI * 2;
      const rx = 120 + Math.random() * 20;
      const ry = 150 + Math.random() * 20;
      points.push({
        x: 192 + Math.cos(angle) * rx * (0.6 + Math.random() * 0.4),
        y: 210 + Math.sin(angle) * ry * (0.5 + Math.random() * 0.5),
      });
    }
    setLandmarkPoints(points);
  }, []);

  // Simulate EAR metrics updating
  useEffect(() => {
    if (currentPhase !== 'ear' && currentPhase !== 'blink') return;
    const interval = setInterval(() => {
      const baseEar = 0.22 + Math.random() * 0.12;
      setEarLeft(parseFloat(baseEar.toFixed(3)));
      setEarRight(parseFloat((baseEar + (Math.random() * 0.04 - 0.02)).toFixed(3)));
      setEyelidLeft(parseFloat((3 + Math.random() * 2.5).toFixed(1)));
      setEyelidRight(parseFloat((3 + Math.random() * 2.5).toFixed(1)));
      if (currentPhase === 'blink' && Math.random() > 0.7) {
        setBlinkCount(prev => prev + 1);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [currentPhase]);

  // Cycle movement prompts
  useEffect(() => {
    if (currentPhase !== 'movement') return;
    setMovementIndex(0);
    const interval = setInterval(() => {
      setMovementIndex(prev => (prev + 1) % movementPrompts.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [currentPhase]);

  // Draw heatmap
  useEffect(() => {
    if (!showHeatmap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const regions = [
      { x: 192, y: 100, r: 90, color: [255, 60, 30, 0.45], mid: [255, 140, 0, 0.3] },
      { x: 130, y: 230, r: 60, color: [255, 80, 30, 0.4], mid: [255, 160, 50, 0.25] },
      { x: 254, y: 230, r: 60, color: [255, 80, 30, 0.4], mid: [255, 160, 50, 0.25] },
      { x: 192, y: 190, r: 40, color: [255, 30, 0, 0.35], mid: [255, 100, 0, 0.0] },
    ];

    regions.forEach(({ x, y, r, color, mid }) => {
      const grad = ctx.createRadialGradient(x, y, 5, x, y, r);
      grad.addColorStop(0, `rgba(${color.join(',')})`);
      grad.addColorStop(0.5, `rgba(${mid.join(',')})`);
      grad.addColorStop(1, 'rgba(255,200,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Eye regions - cooler
    [{ x: 145, y: 165 }, { x: 239, y: 165 }].forEach(({ x, y }) => {
      const grad = ctx.createRadialGradient(x, y, 3, x, y, 30);
      grad.addColorStop(0, 'rgba(0, 150, 255, 0.3)');
      grad.addColorStop(1, 'rgba(0, 200, 255, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
  }, [showHeatmap]);

  // Main progress timer
  const onCompleteRef = useCallback(onComplete, [onComplete]);
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SCAN_DURATION) * 100, 100);
      setProgress(pct);

      const current = [...phases].reverse().find(s => pct >= s.at);
      if (current) {
        setStatus(current.text);
        setCurrentPhase(current.phase);
        setShowHeatmap(current.phase === 'heatmap');
      }

      if (pct >= 100) {
        clearInterval(interval);
        const result = generateMockScreeningResult();
        setTimeout(() => onCompleteRef(result), 500);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onCompleteRef]);

  const allPhaseKeys: Phase[] = ['detect', 'landmarks', 'ear', 'blink', 'movement', 'heatmap', 'final'];
  const phaseLabels: Record<Phase, string> = {
    detect: 'detect', landmarks: 'landmarks', ear: 'EAR', blink: 'blink',
    movement: 'movement', heatmap: 'thermal', final: 'final',
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-screening">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg text-center"
      >
        {/* Camera with full face guide */}
        <div className="relative mx-auto mb-4 w-[384px] h-[420px] overflow-hidden rounded-2xl shadow-elevated bg-black/20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Full face outline SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 384 420">
            <ellipse cx="192" cy="210" rx="120" ry="160" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
            <path d="M 72 210 Q 72 370 192 380 Q 312 370 312 210" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
            {/* Eye guides with EAR measurement lines */}
            <ellipse cx="145" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="239" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            {/* EAR measurement markers on eyes */}
            {(currentPhase === 'ear' || currentPhase === 'blink') && (
              <>
                {/* Left eye vertical (height) */}
                <line x1="145" y1="161" x2="145" y2="189" stroke="hsl(var(--warning))" strokeWidth="1.5" opacity="0.8" />
                <line x1="140" y1="161" x2="150" y2="161" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="140" y1="189" x2="150" y2="189" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                {/* Left eye horizontal (width) */}
                <line x1="117" y1="175" x2="173" y2="175" stroke="hsl(var(--info))" strokeWidth="1.5" opacity="0.8" />
                {/* Right eye vertical */}
                <line x1="239" y1="161" x2="239" y2="189" stroke="hsl(var(--warning))" strokeWidth="1.5" opacity="0.8" />
                <line x1="234" y1="161" x2="244" y2="161" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="234" y1="189" x2="244" y2="189" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                {/* Right eye horizontal */}
                <line x1="211" y1="175" x2="267" y2="175" stroke="hsl(var(--info))" strokeWidth="1.5" opacity="0.8" />
              </>
            )}
            <path d="M 192 155 L 192 225 M 175 230 Q 192 245 209 230" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
            <path d="M 160 275 Q 192 295 224 275" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
            <path d="M 115 148 Q 145 135 175 148" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
            <path d="M 209 148 Q 239 135 269 148" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
            <g stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.7">
              <path d="M 20 50 L 20 20 L 50 20" fill="none" />
              <path d="M 334 20 L 364 20 L 364 50" fill="none" />
              <path d="M 20 370 L 20 400 L 50 400" fill="none" />
              <path d="M 334 400 L 364 400 L 364 370" fill="none" />
            </g>
          </svg>

          {/* Landmark dots */}
          <AnimatePresence>
            {(currentPhase === 'landmarks') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                {landmarkPoints.map((pt, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary"
                    style={{ left: pt.x, top: pt.y }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0.6], scale: [0, 1.5, 1] }}
                    transition={{ delay: i * 0.02, duration: 0.4 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Heatmap canvas */}
          <AnimatePresence>
            {showHeatmap && (
              <motion.canvas
                ref={canvasRef}
                width={384}
                height={420}
                className="absolute inset-0 w-full h-full pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Movement prompt overlay */}
          <AnimatePresence>
            {currentPhase === 'movement' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  key={movementIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="rounded-2xl bg-background/80 backdrop-blur-sm px-6 py-4 text-center shadow-elevated"
                >
                  <div className="text-4xl mb-2">{movementPrompts[movementIndex].icon}</div>
                  <p className="text-sm font-semibold text-foreground">
                    {movementPrompts[movementIndex].instruction}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Checking for swelling…</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Heatmap legend */}
          <AnimatePresence>
            {showHeatmap && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              >
                <span className="text-[9px] font-bold text-primary-foreground/80">°F</span>
                <div className="h-28 w-3 rounded-full bg-gradient-to-b from-destructive via-warning to-info shadow-lg" />
                <div className="flex flex-col items-center text-[8px] text-primary-foreground/70 font-medium">
                  <span>100.4</span>
                  <span className="mt-5">98.6</span>
                  <span className="mt-5">96.0</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* EAR Metrics Panel */}
        <AnimatePresence>
          {(currentPhase === 'ear' || currentPhase === 'blink') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto mb-4 grid grid-cols-2 gap-2 max-w-sm"
            >
              <div className="rounded-xl bg-card/90 backdrop-blur-sm p-3 shadow-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Left Eye</span>
                </div>
                <div className="text-lg font-bold text-foreground font-display">{earLeft.toFixed(3)}</div>
                <div className="text-[10px] text-muted-foreground">EAR · {eyelidLeft}mm opening</div>
                <div className={`mt-1 text-[10px] font-semibold ${earLeft < 0.25 ? 'text-destructive' : 'text-primary'}`}>
                  {earLeft < 0.25 ? '⚠ Low EAR — droopy' : '✓ Normal range'}
                </div>
              </div>
              <div className="rounded-xl bg-card/90 backdrop-blur-sm p-3 shadow-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Right Eye</span>
                </div>
                <div className="text-lg font-bold text-foreground font-display">{earRight.toFixed(3)}</div>
                <div className="text-[10px] text-muted-foreground">EAR · {eyelidRight}mm opening</div>
                <div className={`mt-1 text-[10px] font-semibold ${earRight < 0.25 ? 'text-destructive' : 'text-primary'}`}>
                  {earRight < 0.25 ? '⚠ Low EAR — droopy' : '✓ Normal range'}
                </div>
              </div>
              {currentPhase === 'blink' && (
                <>
                  <div className="rounded-xl bg-card/90 backdrop-blur-sm p-3 shadow-card">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Blink Rate</span>
                    </div>
                    <div className="text-lg font-bold text-foreground font-display">{blinkCount}</div>
                    <div className="text-[10px] text-muted-foreground">blinks detected</div>
                  </div>
                  <div className="rounded-xl bg-card/90 backdrop-blur-sm p-3 shadow-card">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Move className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Symmetry</span>
                    </div>
                    <div className="text-lg font-bold text-foreground font-display">
                      {Math.abs(earLeft - earRight).toFixed(3)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">L-R difference</div>
                    <div className={`mt-1 text-[10px] font-semibold ${Math.abs(earLeft - earRight) > 0.05 ? 'text-destructive' : 'text-primary'}`}>
                      {Math.abs(earLeft - earRight) > 0.05 ? '⚠ Asymmetric' : '✓ Symmetric'}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* EAR Formula display */}
        <AnimatePresence>
          {currentPhase === 'ear' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto mb-4 rounded-xl bg-card/80 backdrop-blur-sm px-4 py-2 shadow-card max-w-xs"
            >
              <p className="text-[10px] font-mono text-muted-foreground text-center">
                EAR = <span className="text-warning">eye_height</span> / <span className="text-info">eye_width</span>
                {' · '}Low EAR {'<'} 0.25 → droopy/tired
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Phase indicator chips */}
        <div className="mb-4 flex justify-center gap-1.5 flex-wrap">
          {allPhaseKeys.map(p => (
            <div
              key={p}
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider transition-all duration-300 ${
                currentPhase === p
                  ? 'bg-primary text-primary-foreground scale-105'
                  : allPhaseKeys.indexOf(p) <= allPhaseKeys.indexOf(currentPhase)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {phaseLabels[p]}
            </div>
          ))}
        </div>

        {/* Status */}
        <motion.p
          key={status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-lg font-medium text-primary-foreground/90 font-display"
        >
          {status}
        </motion.p>

        {/* Progress bar */}
        <div className="mx-auto mb-3 h-2 w-72 overflow-hidden rounded-full bg-primary/10">
          <motion.div
            className="h-full rounded-full gradient-primary"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-sm text-primary-foreground/50">{Math.round(progress)}%</p>
      </motion.div>
    </div>
  );
};

export default VisualScreeningScreen;
