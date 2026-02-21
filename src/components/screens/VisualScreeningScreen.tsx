import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreeningResult } from '@/lib/screening-types';
import { generateMockScreeningResult } from '@/lib/mock-screening';

interface VisualScreeningScreenProps {
  stream: MediaStream;
  onComplete: (result: ScreeningResult) => void;
}

const SCAN_DURATION = 12000; // 12 seconds total

const phases = [
  { at: 0, text: 'Detecting face…', phase: 'detect' },
  { at: 10, text: 'Mapping facial landmarks…', phase: 'landmarks' },
  { at: 25, text: 'Analyzing eye indicators…', phase: 'eyes' },
  { at: 40, text: 'Checking fatigue markers…', phase: 'fatigue' },
  { at: 55, text: 'Scanning thermal pattern…', phase: 'heatmap' },
  { at: 70, text: 'Evaluating fever indicators…', phase: 'heatmap' },
  { at: 85, text: 'Compiling results…', phase: 'final' },
];

const VisualScreeningScreen = ({ stream, onComplete }: VisualScreeningScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing…');
  const [currentPhase, setCurrentPhase] = useState('detect');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [landmarkPoints, setLandmarkPoints] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Generate fake landmark dots
  useEffect(() => {
    const points: { x: number; y: number }[] = [];
    // Face outline points
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

  // Draw heatmap overlay on canvas
  useEffect(() => {
    if (!showHeatmap || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawHeatmap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Forehead region - warm
      const foreheadGrad = ctx.createRadialGradient(192, 100, 10, 192, 100, 90);
      foreheadGrad.addColorStop(0, 'rgba(255, 60, 30, 0.45)');
      foreheadGrad.addColorStop(0.4, 'rgba(255, 140, 0, 0.3)');
      foreheadGrad.addColorStop(1, 'rgba(255, 200, 0, 0.0)');
      ctx.fillStyle = foreheadGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cheek regions
      const leftCheek = ctx.createRadialGradient(130, 230, 5, 130, 230, 60);
      leftCheek.addColorStop(0, 'rgba(255, 80, 30, 0.4)');
      leftCheek.addColorStop(0.5, 'rgba(255, 160, 50, 0.25)');
      leftCheek.addColorStop(1, 'rgba(255, 200, 100, 0.0)');
      ctx.fillStyle = leftCheek;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rightCheek = ctx.createRadialGradient(254, 230, 5, 254, 230, 60);
      rightCheek.addColorStop(0, 'rgba(255, 80, 30, 0.4)');
      rightCheek.addColorStop(0.5, 'rgba(255, 160, 50, 0.25)');
      rightCheek.addColorStop(1, 'rgba(255, 200, 100, 0.0)');
      ctx.fillStyle = rightCheek;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nose bridge - hot
      const nose = ctx.createRadialGradient(192, 190, 5, 192, 190, 40);
      nose.addColorStop(0, 'rgba(255, 30, 0, 0.35)');
      nose.addColorStop(1, 'rgba(255, 100, 0, 0.0)');
      ctx.fillStyle = nose;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Eye regions - cooler
      const leftEye = ctx.createRadialGradient(145, 165, 3, 145, 165, 30);
      leftEye.addColorStop(0, 'rgba(0, 150, 255, 0.3)');
      leftEye.addColorStop(1, 'rgba(0, 200, 255, 0.0)');
      ctx.fillStyle = leftEye;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rightEye = ctx.createRadialGradient(239, 165, 3, 239, 165, 30);
      rightEye.addColorStop(0, 'rgba(0, 150, 255, 0.3)');
      rightEye.addColorStop(1, 'rgba(0, 200, 255, 0.0)');
      ctx.fillStyle = rightEye;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    drawHeatmap();
  }, [showHeatmap]);

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
        setTimeout(() => onComplete(result), 500);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-screening">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-md text-center"
      >
        {/* Camera with full face guide */}
        <div className="relative mx-auto mb-8 w-[384px] h-[420px] overflow-hidden rounded-2xl shadow-elevated bg-black/20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Full face outline SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 384 420"
          >
            {/* Face oval */}
            <ellipse
              cx="192" cy="210" rx="120" ry="160"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.6"
            />
            {/* Jaw line */}
            <path
              d="M 72 210 Q 72 370 192 380 Q 312 370 312 210"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.4"
            />
            {/* Left eye guide */}
            <ellipse cx="145" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            {/* Right eye guide */}
            <ellipse cx="239" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            {/* Nose guide */}
            <path d="M 192 155 L 192 225 M 175 230 Q 192 245 209 230" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
            {/* Mouth guide */}
            <path d="M 160 275 Q 192 295 224 275" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.4" />
            {/* Eyebrow guides */}
            <path d="M 115 148 Q 145 135 175 148" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />
            <path d="M 209 148 Q 239 135 269 148" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.35" />

            {/* Corner markers */}
            <g stroke="hsl(var(--primary))" strokeWidth="2.5" opacity="0.7">
              <path d="M 20 50 L 20 20 L 50 20" fill="none" />
              <path d="M 334 20 L 364 20 L 364 50" fill="none" />
              <path d="M 20 370 L 20 400 L 50 400" fill="none" />
              <path d="M 334 400 L 364 400 L 364 370" fill="none" />
            </g>
          </svg>

          {/* Landmark dots animation */}
          <AnimatePresence>
            {(currentPhase === 'landmarks' || currentPhase === 'eyes' || currentPhase === 'fatigue') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none"
              >
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

          {/* Heatmap overlay */}
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

          {/* Heatmap legend */}
          <AnimatePresence>
            {showHeatmap && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              >
                <span className="text-[9px] font-bold text-white/80">°F</span>
                <div className="h-28 w-3 rounded-full bg-gradient-to-b from-red-500 via-yellow-400 to-blue-400 shadow-lg" />
                <div className="flex flex-col items-center text-[8px] text-white/70 font-medium">
                  <span>100.4</span>
                  <span className="mt-5">98.6</span>
                  <span className="mt-5">96.0</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Phase indicator chips */}
        <div className="mb-4 flex justify-center gap-2 flex-wrap">
          {['detect', 'landmarks', 'eyes', 'fatigue', 'heatmap', 'final'].map(p => (
            <div
              key={p}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 ${
                currentPhase === p
                  ? 'bg-primary text-primary-foreground scale-105'
                  : phases.findIndex(ph => ph.phase === p) <= phases.findIndex(ph => ph.phase === currentPhase)
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {p === 'heatmap' ? 'thermal' : p}
            </div>
          ))}
        </div>

        {/* Status */}
        <motion.p
          key={status}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-lg font-medium text-primary-foreground/90 font-display"
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
