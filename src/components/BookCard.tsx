import { useState, useMemo } from 'react';
import { BookMetadata } from '../types';
import { MoreVertical, CheckCircle, Circle, Trash2, Book as BookIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookCardProps {
  book: BookMetadata;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleRead: (id: string, currentProgress: number, totalPages: number) => void;
}

// Generate a consistent gradient based on string
const getGradient = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const c1 = `hsl(${hash % 360}, 70%, 60%)`;
  const c2 = `hsl(${(hash + 40) % 360}, 70%, 40%)`;
  
  return `linear-gradient(135deg, ${c1}, ${c2})`;
};

export function BookCard({ book, onClick, onDelete, onToggleRead }: BookCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const progressPercent = Math.round((book.progress / (book.totalPages || 1)) * 100);
  const isRead = progressPercent === 100;
  
  const backgroundGradient = useMemo(() => getGradient(book.title), [book.title]);

  return (
    <>
      <motion.div
        layoutId={`book-${book.id}`}
        whileHover={{ y: -4 }}
        className="group relative flex flex-col h-full bg-card rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden border border-border"
        onClick={() => onClick(book.id)}
      >
        {/* Cover Image Area */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div 
              className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
              style={{ background: backgroundGradient }}
            >
              <BookIcon className="w-12 h-12 text-white/80 mb-3 drop-shadow-md" />
              <h3 className="text-white font-serif font-bold text-lg leading-tight line-clamp-3 drop-shadow-md">
                {book.title}
              </h3>
              <p className="text-white/80 text-xs mt-2 font-medium uppercase tracking-wider drop-shadow-sm">
                {book.author}
              </p>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            {isRead && (
              <span className="bg-green-500/90 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                Read
              </span>
            )}
            {!isRead && progressPercent > 0 && (
              <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm">
                {progressPercent}%
              </span>
            )}
          </div>

          {/* Progress Bar Overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className={`h-full ${isRead ? 'bg-green-500' : 'bg-primary'}`}
            />
          </div>
          
          {/* Hover Overlay for Quick Actions */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
             <span className="bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
               Read Now
             </span>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-4 flex flex-col flex-1 relative bg-card">
          <div className="flex justify-between items-start gap-2 mb-1">
             <h3 className="font-bold text-card-foreground line-clamp-2 leading-tight text-base group-hover:text-primary transition-colors">
              {book.title}
            </h3>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-1 -mr-2 -mt-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{book.author}</p>
          
          <div className="flex flex-wrap gap-1 mb-3 h-5 overflow-hidden">
            {book.category && (
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                {book.category}
              </span>
            )}
            {book.tags?.slice(0, 1).map((tag, i) => (
              <span key={i} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md truncate max-w-[100px]">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
            <span className="uppercase tracking-wider font-medium">{book.format}</span>
            <span>{new Date(book.dateAdded).toLocaleDateString()}</span>
          </div>

          {/* Menu Dropdown */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-2 top-10 w-48 bg-popover rounded-xl shadow-xl border border-border py-1 z-50 overflow-hidden text-popover-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRead(book.id, book.progress, book.totalPages || 1);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                  >
                    {isRead ? <Circle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {isRead ? 'Mark as Unread' : 'Mark as Read'}
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(book.id);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Book
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
