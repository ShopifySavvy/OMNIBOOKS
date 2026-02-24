import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { useEffect } from 'react';

interface SplashProps {
  onComplete: () => void;
}

export function Splash({ onComplete }: SplashProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500); // 2.5 seconds splash
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "backOut" }}
          className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-primary-foreground mb-6 shadow-2xl shadow-primary/30"
        >
          <BookOpen className="w-12 h-12" />
        </motion.div>
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl font-bold tracking-tight text-foreground"
        >
          OMNIBOOKS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-muted-foreground mt-2 text-lg"
        >
          Your personal library, everywhere.
        </motion.p>
      </motion.div>
    </div>
  );
}
