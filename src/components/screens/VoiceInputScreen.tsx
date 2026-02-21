import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Square, Play, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VoiceInputScreenProps {
  onComplete: (transcript: string) => void;
  onSkip: () => void;
}

const VoiceInputScreen = ({ onComplete, onSkip }: VoiceInputScreenProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Audio analyser for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioURL(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        audioContext.close();

        // Send to Azure Whisper for real transcription
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');

          const { data, error } = await supabase.functions.invoke('transcribe', {
            body: formData,
          });

          if (error) throw error;
          if (data?.text) {
            setTranscript(data.text);
          } else {
            toast.error('No speech detected. Please try again.');
          }
        } catch (err) {
          console.error('Transcription error:', err);
          toast.error('Transcription failed. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setAudioURL(null);
      setTranscript('');

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Visualize audio level
      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // Mic denied
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Voice Input</span>
        </div>
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">
          Describe Your Symptoms
        </h2>
        <p className="mb-8 text-muted-foreground text-sm">
          Record a short audio describing how you feel. This will be transcribed and added to your intake form.
        </p>

        {/* Audio visualizer */}
        <div className="relative mx-auto mb-8 flex items-center justify-center">
          <div className="relative">
            {/* Pulse rings */}
            {isRecording && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-destructive/30"
                  animate={{ scale: [1, 1.5 + audioLevel], opacity: [0.5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  style={{ width: 120, height: 120, left: -10, top: -10 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-destructive/20"
                  animate={{ scale: [1, 1.8 + audioLevel * 0.5], opacity: [0.3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{ width: 120, height: 120, left: -10, top: -10 }}
                />
              </>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300 shadow-elevated ${
                isRecording
                  ? 'bg-destructive text-destructive-foreground'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {isRecording ? <Square className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
          </div>
        </div>

        {/* Timer */}
        {(isRecording || duration > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6"
          >
            <span className="text-2xl font-mono font-bold text-foreground">{formatTime(duration)}</span>
            {isRecording && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-medium">Recording…</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Playback */}
        <AnimatePresence>
          {audioURL && !isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 space-y-4"
            >
              <div className="rounded-xl bg-card p-4 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Recording saved</span>
                  <span className="ml-auto text-xs text-muted-foreground">{formatTime(duration)}</span>
                </div>
                <audio src={audioURL} controls className="w-full h-8" />
              </div>

              {/* Transcribing indicator */}
              {isTranscribing && (
                <div className="rounded-xl bg-card p-4 shadow-card flex items-center gap-3">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-sm text-muted-foreground">Transcribing with Whisper AI…</span>
                </div>
              )}

              {/* Transcript */}
              {transcript && !isTranscribing && (
                <div className="rounded-xl bg-card p-4 shadow-card text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Transcript
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{transcript}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="space-y-3">
          {transcript && (
            <Button
              onClick={() => onComplete(transcript)}
              size="lg"
              className="w-full rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
            >
              Continue with Transcript
            </Button>
          )}
          {!isRecording && !transcript && (
            <p className="text-sm text-muted-foreground">
              Tap the microphone to start recording
            </p>
          )}
          <Button
            variant="ghost"
            onClick={onSkip}
            className="w-full gap-2 text-muted-foreground"
          >
            <SkipForward className="h-4 w-4" />
            Skip Voice Input
          </Button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          Audio is processed locally and not stored on any server.
        </p>
      </motion.div>
    </div>
  );
};

export default VoiceInputScreen;
