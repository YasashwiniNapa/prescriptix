import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CameraScreenProps {
  onCameraReady: (stream: MediaStream) => void;
}

const CameraScreen = ({ onCameraReady }: CameraScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const enableCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    enableCamera();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleContinue = () => {
    if (stream) onCameraReady(stream);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <h2 className="mb-2 text-2xl font-bold font-display text-foreground">Camera Access</h2>
        <p className="mb-8 text-muted-foreground">
          We need your camera to perform the visual screening.
        </p>

        {/* Camera preview */}
        <div className="relative mx-auto mb-8 aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl bg-muted shadow-card">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Camera className="h-12 w-12 text-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">Camera preview</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!stream ? (
          <Button
            onClick={enableCamera}
            disabled={loading}
            size="lg"
            className="w-full gap-2 rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
          >
            <Camera className="h-5 w-5" />
            {loading ? 'Requesting access…' : 'Enable Camera'}
          </Button>
        ) : (
          <Button
            onClick={handleContinue}
            size="lg"
            className="w-full gap-2 rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
          >
            Continue to Screening
          </Button>
        )}

        <p className="mt-6 text-xs text-muted-foreground/60">
          Your camera feed is processed locally and is not recorded.
        </p>
      </motion.div>
    </div>
  );
};

export default CameraScreen;
