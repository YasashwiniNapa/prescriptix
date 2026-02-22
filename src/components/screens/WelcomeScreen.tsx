import { motion } from 'framer-motion';
import { Shield, Eye, Sparkles, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface WelcomeScreenProps {
  onStart: () => void;
  onVideoUpload?: () => void;
  onBack?: () => void;
}

// marketing and entry screen for starting scans
const WelcomeScreen = ({ onStart, onVideoUpload, onBack }: WelcomeScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      {/* Back button */}
      {onBack && (
        <div className="fixed top-6 left-6 z-10">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      )}

      <div className="max-w-md mx-auto text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Prescriptix logo" className="h-24 w-24 rounded-2xl shadow-elevated" />
        </div>

        <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground font-display">
          Prescriptix
        </h1>
        <p className="mb-2 text-lg font-medium text-foreground/80 font-display">
          Facial Asymmetry Screening
        </p>
        <p className="mb-10 text-muted-foreground leading-relaxed">
          We'll perform a quick facial landmark analysis to screen for neurological asymmetry patterns. It only takes a moment.
        </p>

        <div className="space-y-3">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full gap-2 rounded-xl py-6 text-base font-semibold gradient-primary border-0 text-primary-foreground shadow-elevated hover:opacity-90 transition-opacity"
          >
            <Sparkles className="h-5 w-5" />
            Live Camera Scan
          </Button>

          {onVideoUpload && (
            <Button
              onClick={onVideoUpload}
              size="lg"
              variant="outline"
              className="w-full gap-2 rounded-xl py-6 text-base font-semibold"
            >
              <Upload className="h-5 w-5" />
              Upload Video Scan
            </Button>
          )}
        </div>


        {/* Privacy + Disclaimer */}
        <div className="mt-8 space-y-1">
          <p className="text-xs text-muted-foreground/70">
            <Shield className="mr-1 inline h-3 w-3" />
            Your data is processed locally and never stored without consent.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
