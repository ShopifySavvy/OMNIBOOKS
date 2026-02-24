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
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">OMNIBOOKS</h1>
        </div>
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-muted-foreground hover:bg-muted rounded-lg"
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
              ? "bg-primary/10 text-primary shadow-sm" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              ? "bg-primary/10 text-primary shadow-sm" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
              ? "bg-primary/10 text-primary shadow-sm" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-border">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-colors shadow-lg shadow-primary/20 font-medium"
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
      <div className="hidden md:block w-64 h-screen bg-card border-r border-border p-6 fixed left-0 top-0 z-20 transition-colors duration-300">
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
              className="md:hidden fixed inset-y-0 left-0 w-64 bg-card p-6 z-50 shadow-xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
