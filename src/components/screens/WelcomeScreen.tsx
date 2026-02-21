import { motion } from 'framer-motion';
import { Shield, Eye, Sparkles, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';

interface WelcomeScreenProps {
  onStart: () => void;
  onVideoUpload?: () => void;
}

const WelcomeScreen = ({ onStart, onVideoUpload }: WelcomeScreenProps) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-md text-center"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-8"
        >
          <img src={logo} alt="Prescriptix logo" className="h-24 w-24 rounded-2xl shadow-elevated" />
        </motion.div>

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

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 grid grid-cols-3 gap-4 text-center"
        >
          {[
            { icon: Eye, label: 'AI-Powered' },
            { icon: Shield, label: 'Private' },
            { icon: Sparkles, label: 'Instant' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-4 w-4 text-secondary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Privacy + Disclaimer */}
        <div className="mt-8 space-y-1">
          <p className="text-xs text-muted-foreground/70">
            <Shield className="mr-1 inline h-3 w-3" />
            Your data is processed locally and never stored without consent.
          </p>
          <p className="text-[10px] text-muted-foreground/50">
            This tool provides asymmetry risk screening only — not a medical diagnosis.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default WelcomeScreen;
