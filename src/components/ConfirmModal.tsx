import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirm',
  isDestructive = false 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden z-10"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full ${isDestructive ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium shadow-sm ${
                  isDestructive 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-200 dark:shadow-red-900/30' 
                    : 'bg-cyan-500 hover:bg-cyan-600'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
