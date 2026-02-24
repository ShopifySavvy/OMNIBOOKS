import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, KeyRound, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

interface SignupProps {
  onLoginSuccess: () => void;
}

export function Signup({ onLoginSuccess }: SignupProps) {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError(null);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (email.includes('@')) {
        setStep('otp');
      } else {
        setError('Please enter a valid email address.');
      }
    }, 1500);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setIsLoading(true);
    setError(null);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (otp === '123456') { // Mock OTP
        onLoginSuccess();
      } else {
        setError('Invalid OTP. Please try again (use 123456).');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to OMNIBOOKS</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {step === 'email' ? 'Sign in or create an account' : 'Check your email for the code'}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-red-500 text-sm flex items-center gap-2"
                >
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  One-Time Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-gray-900 dark:text-white placeholder-gray-400 tracking-widest font-mono text-lg"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  We sent a code to <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>
                </p>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg text-xs">
                  <p className="font-semibold">Demo Mode:</p>
                  <p>Use code <span className="font-mono font-bold">123456</span> to sign in.</p>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="text-red-500 text-sm flex items-center gap-2"
                >
                  <div className="w-1 h-1 rounded-full bg-red-500" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading || otp.length < 6}
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Sign In <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError(null);
                }}
                className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm py-2 transition-colors"
              >
                Change email address
              </button>
            </form>
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </motion.div>
    </div>
  );
}
