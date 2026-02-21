import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScreeningResult } from '@/lib/screening-types';
import { generateMockScreeningResult } from '@/lib/mock-screening';

interface VisualScreeningScreenProps {
  stream: MediaStream;
  onComplete: (result: ScreeningResult) => void;
}

const SCAN_DURATION = 8000; // 8 seconds

const VisualScreeningScreen = ({ stream, onComplete }: VisualScreeningScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing…');

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const startTime = Date.now();
    const statuses = [
      { at: 0, text: 'Detecting face…' },
      { at: 15, text: 'Mapping facial landmarks…' },
      { at: 35, text: 'Analyzing eye indicators…' },
      { at: 55, text: 'Checking fatigue markers…' },
      { at: 75, text: 'Evaluating skin tone…' },
      { at: 90, text: 'Finalizing analysis…' },
    ];

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / SCAN_DURATION) * 100, 100);
      setProgress(pct);

      const current = [...statuses].reverse().find(s => pct >= s.at);
      if (current) setStatus(current.text);

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
        className="w-full max-w-sm text-center"
      >
        {/* Camera with face guide overlay */}
        <div className="relative mx-auto mb-8 aspect-square w-72 overflow-hidden rounded-full shadow-elevated">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Face outline guide */}
          <div className="absolute inset-4 rounded-full border-2 border-primary/50" />
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          
          {/* Scanning line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-primary/60"
            style={{ top: '0%' }}
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute h-full w-full rounded-full border border-primary/20 animate-pulse-ring" />
          </div>
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
        <div className="mx-auto mb-3 h-2 w-64 overflow-hidden rounded-full bg-primary/10">
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
