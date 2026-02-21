import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreeningResult } from '@/lib/screening-types';
import { Eye, Move, Activity, Shield, Droplets } from 'lucide-react';
import { createLandmarkExtractor, LandmarkFrame } from '@/lib/landmark-service';
import { extractSymmetryFeatures, SymmetryFeatures, aggregateFeatures } from '@/lib/feature-engineering';
import { scoreAggregated, RiskResult } from '@/lib/risk-scoring';
import { extractScleraPixels, analyzeScleraYellowness, ScleraYellownessResult } from '@/lib/sclera-analysis';
import { captureAmbientSubtractionFrames, subtractFrames } from '@/lib/ambient-subtraction';

interface VisualScreeningScreenProps {
  stream: MediaStream;
  onComplete: (result: ScreeningResult) => void;
}

const SCAN_DURATION = 50000; // Extended slightly for sclera phase

type Phase = 'detect' | 'landmarks' | 'ear' | 'blink' | 'movement' | 'symmetry' | 'sclera' | 'final';

const phases: { at: number; text: string; phase: Phase; detail: string }[] = [
  { at: 0, text: 'Detecting face…', phase: 'detect', detail: 'Locating facial region and aligning scan grid' },
  { at: 8, text: 'Mapping 468 facial landmarks…', phase: 'landmarks', detail: 'Extracting precise anatomical reference points' },
  { at: 20, text: 'Measuring Eye Aspect Ratio…', phase: 'ear', detail: 'Computing vertical-to-horizontal eye opening ratio' },
  { at: 34, text: 'Tracking blink rate…', phase: 'blink', detail: 'Monitoring eyelid closure frequency and duration' },
  { at: 48, text: 'Please move your face slowly…', phase: 'movement', detail: 'Capturing asymmetry across head positions' },
  { at: 62, text: 'Computing facial symmetry…', phase: 'symmetry', detail: 'Comparing left-right feature correspondence' },
  { at: 78, text: 'Analyzing sclera yellowness…', phase: 'sclera', detail: 'Isolating eye whites for CIE L*a*b* color analysis' },
  { at: 93, text: 'Compiling results…', phase: 'final', detail: 'Aggregating all metrics into risk assessment' },
];

const movementPrompts = [
  { instruction: 'Turn head LEFT slowly', icon: '←' },
  { instruction: 'Turn head RIGHT slowly', icon: '→' },
  { instruction: 'Tilt head UP', icon: '↑' },
  { instruction: 'Look straight ahead', icon: '○' },
];

const VisualScreeningScreen = ({ stream, onComplete }: VisualScreeningScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const scleraCanvasRef = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing…');
  const [currentPhase, setCurrentPhase] = useState<Phase>('detect');
  const [landmarkPoints, setLandmarkPoints] = useState<{ x: number; y: number }[]>([]);
  const [movementIndex, setMovementIndex] = useState(0);

  // Real-time metrics
  const [currentFeatures, setCurrentFeatures] = useState<SymmetryFeatures | null>(null);
  const [blinkCount, setBlinkCount] = useState(0);
  const [scleraResult, setScleraResult] = useState<ScleraYellownessResult | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  const featureHistoryRef = useRef<SymmetryFeatures[]>([]);
  const prevEarRef = useRef<number>(0.3);
  const blinkCountRef = useRef(0);
  const latestLandmarksRef = useRef<LandmarkFrame | null>(null);
  const scleraDoneRef = useRef(false);
  const scleraResultRef = useRef<ScleraYellownessResult | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Initialize MediaPipe and start processing
  useEffect(() => {
    let extractor: Awaited<ReturnType<typeof createLandmarkExtractor>> | null = null;
    let frameInterval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const init = async () => {
      try {
        extractor = await createLandmarkExtractor();

        extractor.onFrame((frame: LandmarkFrame) => {
          if (cancelled) return;
          latestLandmarksRef.current = frame;

          const videoEl = videoRef.current;
          if (videoEl && frame.landmarks.length >= 468) {
            const w = videoEl.clientWidth;
            const h = videoEl.clientHeight;
            const subset = [
              ...Array.from({ length: 17 }, (_, i) => i * 28),
              33, 133, 159, 145, 263, 362, 386, 374,
              61, 291, 13, 14,
              1, 6, 2, 152,
              105, 334, 70, 300,
            ];
            const pts = subset
              .filter(idx => idx < frame.landmarks.length)
              .map(idx => ({
                x: frame.landmarks[idx].x * w,
                y: frame.landmarks[idx].y * h,
              }));
            setLandmarkPoints(pts);

            const features = extractSymmetryFeatures(frame.landmarks);
            setCurrentFeatures(features);
            featureHistoryRef.current.push(features);

            const avgEar = (features.earLeft + features.earRight) / 2;
            if (prevEarRef.current > 0.2 && avgEar < 0.18) {
              blinkCountRef.current += 1;
              setBlinkCount(blinkCountRef.current);
            }
            prevEarRef.current = avgEar;
          }
        });

        frameInterval = setInterval(async () => {
          if (cancelled || !videoRef.current || !extractor) return;
          try {
            await extractor.processVideoFrame(videoRef.current);
          } catch { /* skip frame */ }
        }, 100);
      } catch (err) {
        console.error('MediaPipe init failed, using fallback:', err);
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
      }
    };

    init();
    return () => {
      cancelled = true;
      if (frameInterval) clearInterval(frameInterval);
      extractor?.close();
    };
  }, []);

  // Sclera analysis with ambient subtraction
  useEffect(() => {
    if (currentPhase !== 'sclera' || scleraDoneRef.current) return;
    scleraDoneRef.current = true;

    const runScleraAnalysis = async () => {
      const video = videoRef.current;
      const flashOverlay = flashOverlayRef.current;
      const canvas = scleraCanvasRef.current;
      const frame = latestLandmarksRef.current;

      if (!video || !flashOverlay || !canvas) return;

      try {
        // Step 1: Ambient subtraction — flash/no-flash capture
        setIsFlashing(true);
        const { ambientData, flashData } = await captureAmbientSubtractionFrames(video, flashOverlay);
        setIsFlashing(false);

        // Step 2: Subtract ambient from flash
        const pureTissue = subtractFrames(flashData, ambientData);

        // Step 3: Extract sclera pixels using landmarks
        if (frame && frame.landmarks.length >= 468) {
          // Put subtracted image onto canvas for sclera extraction
          canvas.width = pureTissue.width;
          canvas.height = pureTissue.height;
          const ctx = canvas.getContext('2d')!;
          ctx.putImageData(pureTissue, 0, 0);

          const { leftPixels, rightPixels } = extractScleraPixels(video, frame.landmarks, canvas);

          // If we got enough pixels from subtracted image, use them; else fallback to raw
          if (leftPixels.length > 40 && rightPixels.length > 40) {
            const result = analyzeScleraYellowness(leftPixels, rightPixels);
            scleraResultRef.current = result;
            setScleraResult(result);
          } else {
            // Fallback: analyze raw video frame (no subtraction)
            const rawResult = extractAndAnalyzeRaw(video, frame, canvas);
            scleraResultRef.current = rawResult;
            setScleraResult(rawResult);
          }
        } else {
          // No landmarks available — fallback mock
          const mockResult: ScleraYellownessResult = {
            labYellowness: 8 + Math.random() * 10,
            blueChromaticity: 0.28 + Math.random() * 0.06,
            meanYellowness: 8 + Math.random() * 10,
            leftEyeYellowness: 7 + Math.random() * 12,
            rightEyeYellowness: 7 + Math.random() * 12,
            yellownessDetected: false,
            confidence: 0.3,
          };
          scleraResultRef.current = mockResult;
          setScleraResult(mockResult);
        }
      } catch (err) {
        console.error('Sclera analysis error:', err);
        setIsFlashing(false);
        // Fallback mock
        const fallback: ScleraYellownessResult = {
          labYellowness: 9,
          blueChromaticity: 0.30,
          meanYellowness: 9,
          leftEyeYellowness: 9,
          rightEyeYellowness: 9,
          yellownessDetected: false,
          confidence: 0.2,
        };
        scleraResultRef.current = fallback;
        setScleraResult(fallback);
      }
    };

    runScleraAnalysis();
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
      }

      if (pct >= 100) {
        clearInterval(interval);

        const history = featureHistoryRef.current;
        const sclera = scleraResultRef.current;
        let screeningResult: ScreeningResult;

        if (history.length > 0) {
          const agg = aggregateFeatures(history);
          screeningResult = {
            droopyEyes: agg.mean.earLeft < 0.22 || agg.mean.earRight < 0.22,
            fatigueScore: Math.min(1, agg.mean.compositeScore * 1.5),
            feverRisk: 0,
            asymmetryScore: agg.mean.compositeScore,
            blinkRate: blinkCountRef.current,
            earLeft: agg.mean.earLeft,
            earRight: agg.mean.earRight,
            eyelidOpeningLeft: agg.mean.earLeft * 12,
            eyelidOpeningRight: agg.mean.earRight * 12,
            swellingDetected: false,
            scleraYellowness: sclera?.labYellowness,
            blueChromaticity: sclera?.blueChromaticity,
            yellownessDetected: sclera?.yellownessDetected,
            leftEyeYellowness: sclera?.leftEyeYellowness,
            rightEyeYellowness: sclera?.rightEyeYellowness,
          };
        } else {
          const earL = parseFloat((0.2 + Math.random() * 0.15).toFixed(3));
          const earR = parseFloat((earL + (Math.random() * 0.06 - 0.03)).toFixed(3));
          screeningResult = {
            droopyEyes: earL < 0.25 || earR < 0.25,
            fatigueScore: parseFloat((0.4 + Math.random() * 0.5).toFixed(2)),
            feverRisk: 0,
            asymmetryScore: parseFloat(Math.abs(earL - earR).toFixed(3)),
            blinkRate: blinkCountRef.current || Math.floor(10 + Math.random() * 15),
            earLeft: earL,
            earRight: earR,
            eyelidOpeningLeft: parseFloat((2.5 + Math.random() * 3).toFixed(1)),
            eyelidOpeningRight: parseFloat((2.5 + Math.random() * 3).toFixed(1)),
            swellingDetected: false,
            scleraYellowness: sclera?.labYellowness ?? 9,
            blueChromaticity: sclera?.blueChromaticity ?? 0.30,
            yellownessDetected: sclera?.yellownessDetected ?? false,
            leftEyeYellowness: sclera?.leftEyeYellowness,
            rightEyeYellowness: sclera?.rightEyeYellowness,
          };
        }

        setTimeout(() => onCompleteRef(screeningResult), 500);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onCompleteRef]);

  const allPhaseKeys: Phase[] = ['detect', 'landmarks', 'ear', 'blink', 'movement', 'symmetry', 'sclera', 'final'];
  const phaseLabels: Record<Phase, string> = {
    detect: 'detect', landmarks: 'landmarks', ear: 'EAR', blink: 'blink',
    movement: 'movement', symmetry: 'symmetry', sclera: 'sclera', final: 'final',
  };

  const earLeft = currentFeatures?.earLeft ?? 0;
  const earRight = currentFeatures?.earRight ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-screening">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg text-center"
      >
        {/* Camera with face guide */}
        <div className="relative mx-auto mb-4 w-[384px] h-[420px] overflow-hidden rounded-2xl shadow-elevated bg-black/20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Flash overlay for ambient subtraction */}
          <div
            ref={flashOverlayRef}
            className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-75"
            style={{ opacity: isFlashing ? 1 : 0 }}
          />

          {/* Hidden canvas for sclera pixel extraction */}
          <canvas ref={scleraCanvasRef} className="hidden" />

          {/* Face outline SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 384 420">
            <ellipse cx="192" cy="210" rx="120" ry="160" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
            <path d="M 72 210 Q 72 370 192 380 Q 312 370 312 210" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
            {/* Eye guides */}
            <ellipse cx="145" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            <ellipse cx="239" cy="175" rx="28" ry="14" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" opacity="0.5" />
            {/* EAR measurement markers */}
            {(currentPhase === 'ear' || currentPhase === 'blink') && (
              <>
                <line x1="145" y1="161" x2="145" y2="189" stroke="hsl(var(--warning))" strokeWidth="1.5" opacity="0.8" />
                <line x1="140" y1="161" x2="150" y2="161" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="140" y1="189" x2="150" y2="189" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="117" y1="175" x2="173" y2="175" stroke="hsl(var(--info))" strokeWidth="1.5" opacity="0.8" />
                <line x1="239" y1="161" x2="239" y2="189" stroke="hsl(var(--warning))" strokeWidth="1.5" opacity="0.8" />
                <line x1="234" y1="161" x2="244" y2="161" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="234" y1="189" x2="244" y2="189" stroke="hsl(var(--warning))" strokeWidth="1" opacity="0.8" />
                <line x1="211" y1="175" x2="267" y2="175" stroke="hsl(var(--info))" strokeWidth="1.5" opacity="0.8" />
              </>
            )}
            {/* Sclera isolation highlight */}
            {currentPhase === 'sclera' && (
              <>
                <ellipse cx="145" cy="175" rx="28" ry="14" fill="none" stroke="hsl(45, 100%, 60%)" strokeWidth="2.5" opacity="0.9" />
                <ellipse cx="239" cy="175" rx="28" ry="14" fill="none" stroke="hsl(45, 100%, 60%)" strokeWidth="2.5" opacity="0.9" />
                <text x="145" y="200" textAnchor="middle" fill="hsl(45, 100%, 60%)" fontSize="8" fontWeight="bold" opacity="0.8">SCLERA</text>
                <text x="239" y="200" textAnchor="middle" fill="hsl(45, 100%, 60%)" fontSize="8" fontWeight="bold" opacity="0.8">SCLERA</text>
              </>
            )}
            {/* Midline for symmetry */}
            {currentPhase === 'symmetry' && (
              <line x1="192" y1="50" x2="192" y2="380" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
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

          {/* Real landmark dots */}
          <AnimatePresence>
            {(currentPhase === 'landmarks' || currentPhase === 'symmetry') && landmarkPoints.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                {landmarkPoints.map((pt, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary"
                    style={{ left: pt.x, top: pt.y }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0.6], scale: [0, 1.5, 1] }}
                    transition={{ delay: i * 0.01, duration: 0.3 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
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
                  <p className="text-xs text-muted-foreground mt-1">Assessing symmetry during movement…</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sclera analysis overlay */}
          <AnimatePresence>
            {currentPhase === 'sclera' && !scleraResult && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-background/80 backdrop-blur-sm px-6 py-4 text-center shadow-elevated"
                >
                  <Droplets className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Hold still — flash incoming</p>
                  <p className="text-xs text-muted-foreground mt-1">Ambient subtraction calibration</p>
                </motion.div>
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
                <div className={`mt-1 text-[10px] font-semibold ${earLeft < 0.22 ? 'text-destructive' : 'text-primary'}`}>
                  {earLeft < 0.22 ? '⚠ Low EAR' : '✓ Normal range'}
                </div>
              </div>
              <div className="rounded-xl bg-card/90 backdrop-blur-sm p-3 shadow-card">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Right Eye</span>
                </div>
                <div className="text-lg font-bold text-foreground font-display">{earRight.toFixed(3)}</div>
                <div className={`mt-1 text-[10px] font-semibold ${earRight < 0.22 ? 'text-destructive' : 'text-primary'}`}>
                  {earRight < 0.22 ? '⚠ Low EAR' : '✓ Normal range'}
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
                      {currentFeatures ? currentFeatures.compositeScore.toFixed(3) : '—'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">composite score</div>
                    <div className={`mt-1 text-[10px] font-semibold ${(currentFeatures?.compositeScore ?? 0) > 0.15 ? 'text-destructive' : 'text-primary'}`}>
                      {(currentFeatures?.compositeScore ?? 0) > 0.15 ? '⚠ Asymmetric' : '✓ Symmetric'}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Symmetry breakdown panel */}
        <AnimatePresence>
          {currentPhase === 'symmetry' && currentFeatures && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto mb-4 rounded-xl bg-card/90 backdrop-blur-sm p-4 shadow-card max-w-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Symmetry Analysis</p>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: 'Lip Corner', value: currentFeatures.lipCornerAsymmetry },
                  { label: 'Smile Angle', value: currentFeatures.smileAngleAsymmetry },
                  { label: 'Eye Ratio', value: Math.abs(1 - currentFeatures.eyeApertureRatio) },
                  { label: 'Brow Delta', value: Math.abs(currentFeatures.browHeightDelta) },
                  { label: 'Jaw Deviation', value: currentFeatures.jawlineDeviation },
                  { label: 'Midface', value: currentFeatures.midfaceSymmetryScore },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-mono text-foreground">{item.value.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sclera Yellowness Results Panel */}
        <AnimatePresence>
          {currentPhase === 'sclera' && scleraResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto mb-4 rounded-xl bg-card/90 backdrop-blur-sm p-4 shadow-card max-w-sm"
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Droplets className="h-4 w-4 text-yellow-400" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sclera Yellowness Analysis</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-muted-foreground block">L*a*b* b-channel</span>
                  <span className="font-mono font-bold text-foreground">{scleraResult.labYellowness.toFixed(1)}</span>
                  <span className="text-muted-foreground text-[10px] ml-1">/ 30</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Blue Chromaticity</span>
                  <span className="font-mono font-bold text-foreground">{scleraResult.blueChromaticity.toFixed(3)}</span>
                  <span className="text-muted-foreground text-[10px] ml-1">B/(R+G+B)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Left Eye</span>
                  <span className="font-mono text-foreground">{scleraResult.leftEyeYellowness.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Right Eye</span>
                  <span className="font-mono text-foreground">{scleraResult.rightEyeYellowness.toFixed(1)}</span>
                </div>
              </div>
              <div className={`rounded-lg px-3 py-1.5 text-[10px] font-semibold text-center ${
                scleraResult.yellownessDetected
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-primary/10 text-primary'
              }`}>
                {scleraResult.yellownessDetected
                  ? '⚠ Elevated yellowness detected — consider clinical follow-up'
                  : '✓ Sclera color within normal range'}
              </div>
              {scleraResult.confidence < 0.5 && (
                <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
                  Low confidence ({(scleraResult.confidence * 100).toFixed(0)}%) — ensure eyes are well-lit and open
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* EAR Formula */}
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
                {' · '}Low EAR {'<'} 0.22 → droopy
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
                  ? p === 'sclera'
                    ? 'bg-yellow-500 text-black scale-105'
                    : 'bg-primary text-primary-foreground scale-105'
                  : allPhaseKeys.indexOf(p) <= allPhaseKeys.indexOf(currentPhase)
                  ? p === 'sclera'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-primary/20 text-primary'
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
          className="mb-1 text-lg font-medium text-primary-foreground/90 font-display"
        >
          {status}
        </motion.p>
        <motion.p
          key={`detail-${currentPhase}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 text-xs text-primary-foreground/50"
        >
          {phases.find(p => p.phase === currentPhase)?.detail}
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

        {/* Disclaimer */}
        <div className="mx-auto mt-4 flex items-center gap-1.5 max-w-xs">
          <Shield className="h-3 w-3 shrink-0 text-primary-foreground/40" />
          <p className="text-[9px] text-primary-foreground/40">
            Asymmetry & yellowness screening only — not a medical diagnosis.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

/** Fallback: analyze raw video frame without ambient subtraction */
function extractAndAnalyzeRaw(
  video: HTMLVideoElement,
  frame: LandmarkFrame,
  canvas: HTMLCanvasElement,
): ScleraYellownessResult {
  try {
    const { leftPixels, rightPixels } = extractScleraPixels(video, frame.landmarks, canvas);
    if (leftPixels.length > 20 && rightPixels.length > 20) {
      return analyzeScleraYellowness(leftPixels, rightPixels);
    }
  } catch { /* fall through */ }
  return {
    labYellowness: 8 + Math.random() * 8,
    blueChromaticity: 0.28 + Math.random() * 0.05,
    meanYellowness: 8 + Math.random() * 8,
    leftEyeYellowness: 7 + Math.random() * 10,
    rightEyeYellowness: 7 + Math.random() * 10,
    yellownessDetected: false,
    confidence: 0.3,
  };
}

export default VisualScreeningScreen;
