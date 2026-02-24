import { BookOpen, Compass, Settings, Plus, Library as LibraryIcon, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: 'library' | 'discover' | 'settings';
  onTabChange: (tab: 'library' | 'discover' | 'settings') => void;
  onUploadClick: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ activeTab, onTabChange, onUploadClick, isOpen, onClose }: SidebarProps) {
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">OMNIBOOKS</h1>
        </div>
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        <button
          onClick={() => onTabChange('library')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
            activeTab === 'library' 
              ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
          )}
        >
          <LibraryIcon className="w-5 h-5" />
          My Library
        </button>
        <button
          onClick={() => onTabChange('discover')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
            activeTab === 'discover' 
              ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
          )}
        >
          <Compass className="w-5 h-5" />
          Discover
        </button>
        <button
          onClick={() => onTabChange('settings')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium",
            activeTab === 'settings' 
              ? "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 shadow-sm" 
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-3 rounded-xl transition-colors shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30 font-medium"
        >
          <Plus className="w-5 h-5" />
          Add New Book
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 h-screen bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 p-6 fixed left-0 top-0 z-20 transition-colors duration-300">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 p-6 z-50 shadow-xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
