import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, AlertTriangle, CheckCircle2, Shield, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { extractLandmarksFromVideo } from '@/lib/landmark-service';
import { extractSymmetryFeatures, aggregateFeatures, toFeatureVector } from '@/lib/feature-engineering';
import { scoreAggregated, RiskResult } from '@/lib/risk-scoring';
import { isMLBackendConfigured, predict } from '@/lib/ml-api-client';

interface VideoUploadScanScreenProps {
  onBack: () => void;
}

type ScanState = 'idle' | 'processing' | 'complete' | 'error';

const riskColors = {
  low: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  moderate: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
  high: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/30' },
};

const riskLabels = {
  low: 'Low Risk',
  moderate: 'Moderate Asymmetry',
  high: 'High Asymmetry Pattern',
};

const getStatusDotClass = (status: 'normal' | 'warning' | 'alert') => {
  if (status === 'alert') return 'bg-destructive';
  if (status === 'warning') return 'bg-warning';
  return 'bg-success';
};

// processes an uploaded video and scores asymmetry
const VideoUploadScanScreen = ({ onBack }: VideoUploadScanScreenProps) => {
  const [state, setState] = useState<ScanState>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processVideo = useCallback(async (file: File) => {
    setFileName(file.name);
    setState('processing');
    setProgress(0);
    setResult(null);

    try {
      // Extract landmarks frame-by-frame
      const frames = await extractLandmarksFromVideo(file, (pct) => setProgress(pct * 0.8));

      if (frames.length === 0) {
        throw new Error('No face detected in the video. Please ensure your face is clearly visible.');
      }

      setProgress(85);

      // Compute symmetry features per frame
      const featureFrames = frames.map(f => extractSymmetryFeatures(f.landmarks));

      // Aggregate across frames
      const aggregated = aggregateFeatures(featureFrames);

      setProgress(92);

      // Try ML backend first, fall back to heuristic
      let riskResult: RiskResult;
      if (isMLBackendConfigured()) {
        try {
          const fv = toFeatureVector(aggregated);
          const mlResult = await predict(fv);
          riskResult = {
            category: mlResult.category,
            probability: mlResult.probability,
            compositeScore: aggregated.mean.compositeScore,
            details: scoreAggregated(aggregated).details,
            disclaimer: scoreAggregated(aggregated).disclaimer,
          };
        } catch {
          riskResult = scoreAggregated(aggregated);
        }
      } else {
        riskResult = scoreAggregated(aggregated);
      }

      setProgress(100);
      setResult(riskResult);
      setState('complete');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process video.');
      setState('error');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processVideo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('video/')) processVideo(file);
  };

  const reset = () => {
    setState('idle');
    setProgress(0);
    setResult(null);
    setErrorMsg('');
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const risk = result ? riskColors[result.category] : null;

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl"
      >
        <div className="mb-2 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary">Asymmetry Screening</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Upload Video Scan</h2>
        <p className="mb-6 text-muted-foreground text-sm">
          Upload a short facial video for neurological asymmetry analysis. The video is processed locally and never stored.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card
                className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Drop video here or click to browse</p>
                    <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM • Max 30 seconds recommended</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {state === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                  <p className="font-semibold text-foreground mb-1">Processing: {fileName}</p>
                  <p className="text-xs text-muted-foreground mb-4">Extracting landmarks & computing features…</p>
                  <Progress value={progress} className="mx-auto max-w-xs" />
                  <p className="mt-2 text-xs text-muted-foreground">{Math.round(progress)}%</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-destructive/30">
                <CardContent className="py-10 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />
                  <p className="font-semibold text-foreground mb-1">Analysis Failed</p>
                  <p className="text-sm text-muted-foreground mb-4">{errorMsg}</p>
                  <Button onClick={reset} variant="outline">Try Again</Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {state === 'complete' && result && (
            <motion.div key="complete" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Risk badge */}
              <Card className={`mb-4 border ${risk?.border}`}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${risk?.bg}`}>
                        {result.category === 'low' ? (
                          <CheckCircle2 className={`h-6 w-6 ${risk?.text}`} />
                        ) : (
                          <AlertTriangle className={`h-6 w-6 ${risk?.text}`} />
                        )}
                      </div>
                      <div>
                        <p className={`font-bold font-display text-lg ${risk?.text}`}>
                          {riskLabels[result.category]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Probability: {(result.probability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Score: {result.compositeScore.toFixed(3)}
                    </Badge>
                  </div>

                  {/* Detail breakdown */}
                  <div className="space-y-2">
                    {result.details.map((d) => (
                      <div key={d.label} className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2">
                          <span className="text-sm text-foreground">{d.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{d.value.toFixed(4)}</span>
                            <div className={`h-2 w-2 rounded-full ${getStatusDotClass(d.status)}`} />
                          </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Disclaimer */}
              <div className="mb-6 flex items-start gap-2 rounded-xl bg-muted/50 p-3">
                <Shield className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
              </div>

              <div className="flex gap-3">
                <Button onClick={reset} variant="outline" className="flex-1 rounded-xl py-5">
                  Scan Another Video
                </Button>
                <Button onClick={onBack} className="flex-1 rounded-xl py-5 gradient-primary border-0 text-primary-foreground">
                  Done
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {state === 'idle' && (
          <Button onClick={onBack} variant="ghost" className="mt-4 w-full text-muted-foreground">
            ← Back
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default VideoUploadScanScreen;
