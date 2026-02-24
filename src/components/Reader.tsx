import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs, standardFontDataUrl, cMapUrl, cMapPacked } from '../lib/pdf-worker';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, Loader2, Bookmark, StickyNote, Trash2, Plus, Save, Rows, Square, Check, Cloud, Maximize, Minimize } from 'lucide-react';
import { Book, Note } from '../types';
import { updateBookProgress, toggleBookmark, addNote, deleteNote } from '../services/db';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface ReaderProps {
  book: Book;
  onClose: () => void;
}

// LazyPage Component for Virtualization
const LazyPage = React.memo(({ pageNumber, width, scale, onInView, isBookmarked, hasNotes, onPageLoad, initialHeight, forceLoad }: any) => {
  const [isInView, setIsInView] = useState(forceLoad);
  const elementRef = useRef<HTMLDivElement>(null);
  const isIntersectingRef = useRef(false);
  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;
  const [pageHeight, setPageHeight] = useState<number | undefined>(initialHeight);

  useEffect(() => {
    setPageHeight(undefined);
  }, [scale, width]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        isIntersectingRef.current = entries[0].isIntersecting;
        if (entries[0].isIntersecting) {
          setIsInView(true);
          onInView(pageNumber);
        } else {
          // Keep rendered if it was already rendered to prevent layout shifts and flickering during rapid scroll
          // But if we have the exact height, we can unmount to save memory
          // Don't unmount if forced
          if (pageHeight && !forceLoad) {
             setIsInView(false); 
          }
        }
      },
      { rootMargin: '200% 0px' } // Preload 2 screen heights above and below
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [pageNumber, onInView, pageHeight, forceLoad]);

  useEffect(() => {
    if (forceLoad) {
      setIsInView(true);
    } else if (!isIntersectingRef.current && pageHeight) {
      setIsInView(false);
    }
  }, [forceLoad, pageHeight]);

  return (
    <div 
      ref={elementRef} 
      id={`page-${pageNumber}`}
      className="relative flex justify-center bg-white dark:bg-gray-800 shadow-xl transition-all duration-300" 
      data-page-number={pageNumber}
      style={{
        minHeight: pageHeight ? pageHeight : (width ? width * 1.414 : 600),
        height: pageHeight ? pageHeight : undefined
      }}
    >
      {isInView ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Page 
            pageNumber={pageNumber} 
            width={width || 600}
            scale={scale}
            devicePixelRatio={pixelRatio}
            className="shadow-sm"
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
              </div>
            }
            onLoadSuccess={(page) => {
              const viewport = page.getViewport({ scale: scale * pixelRatio });
              // We need the height in CSS pixels (divided by pixelRatio)
              const height = viewport.height / pixelRatio;
              setPageHeight(height);
              if (onPageLoad) onPageLoad(pageNumber, height);
            }}
            onLoadError={(error) => {
              if (error.message !== 'TextLayer task cancelled') {
                console.error(`Page ${pageNumber} load error:`, error);
              }
            }}
            onRenderError={(error) => {
              if (error.message !== 'TextLayer task cancelled') {
                console.error(`Page ${pageNumber} render error:`, error);
              }
            }}
          />
          {isBookmarked && (
            <div className="absolute -top-2 right-4 md:right-8 text-yellow-500 drop-shadow-md z-10">
              <Bookmark className="w-6 h-8 md:w-8 md:h-10 fill-current" />
            </div>
          )}
          {hasNotes && (
            <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
              <div className="bg-yellow-200 text-yellow-800 p-1.5 rounded-lg shadow-md border border-yellow-300">
                <StickyNote className="w-3 h-3 md:w-4 md:h-4" />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900/50">
          <span className="text-gray-400 text-sm font-medium">Page {pageNumber}</span>
        </div>
      )}
    </div>
  );
});

export function Reader({ book, onClose }: ReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(book.progress || 1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState(true);
  const [bookmarks, setBookmarks] = useState<number[]>(book.bookmarks || []);
  const [notes, setNotes] = useState<Note[]>(book.notes || []);
  const [showNotes, setShowNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single');
  const [containerWidth, setContainerWidth] = useState<number>();
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isAutoFit, setIsAutoFit] = useState(false);
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const [pageInput, setPageInput] = useState(pageNumber.toString());
  const [isInputFocused, setIsInputFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync pageInput with pageNumber when not focused
  useEffect(() => {
    if (!isInputFocused) {
      setPageInput(pageNumber.toString());
    }
  }, [pageNumber, isInputFocused]);

  const handlePageLoad = useCallback((pageNumber: number, height: number) => {
    setPageHeights(prev => {
      if (prev[pageNumber] === height) return prev;
      return { ...prev, [pageNumber]: height };
    });
  }, []);
  const progressRef = useRef({ pageNumber, numPages });
  
  const options = useMemo(() => ({
    cMapUrl,
    cMapPacked,
    standardFontDataUrl
  }), []);

  // Swipe state
  const touchStart = useRef<{x: number, y: number} | null>(null);
  const touchEnd = useRef<{x: number, y: number} | null>(null);
  const minSwipeDistance = 50;

  // Update progress ref
  useEffect(() => {
    progressRef.current = { pageNumber, numPages };
  }, [pageNumber, numPages]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (progressRef.current.numPages > 0) {
        updateBookProgress(book.id, progressRef.current.pageNumber, progressRef.current.numPages);
      }
    };
  }, [book.id]);

  // Resize observer to handle responsive page width
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          // Subtract padding (32px for mobile p-4, 64px for desktop p-8)
          const padding = window.innerWidth < 768 ? 32 : 64;
          setContainerWidth(entry.contentRect.width - padding);
          setPageHeights({});
        }
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Debounce save progress
  useEffect(() => {
    setSaveStatus('saving');
    const timeout = setTimeout(async () => {
      await updateBookProgress(book.id, pageNumber, numPages);
      setSaveStatus('saved');
    }, 1000);
    return () => clearTimeout(timeout);
  }, [pageNumber, numPages, book.id]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  const scrollToPage = (page: number) => {
    if (viewMode === 'scroll') {
      const pageElement = document.getElementById(`page-${page}`);
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setPageNumber(page);
  };

  const changePage = (offset: number) => {
    const newPage = Math.min(Math.max(1, pageNumber + offset), numPages);
    scrollToPage(newPage);
  };

  const handleToggleBookmark = async () => {
    setSaveStatus('saving');
    const updatedBookmarks = await toggleBookmark(book.id, pageNumber);
    setBookmarks(updatedBookmarks);
    setSaveStatus('saved');
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    
    setSaveStatus('saving');
    const newNote: Note = {
      id: uuidv4(),
      page: pageNumber,
      content: newNoteContent,
      date: Date.now(),
      color: 'bg-yellow-100'
    };

    const updatedNotes = await addNote(book.id, newNote);
    setNotes(updatedNotes);
    setNewNoteContent('');
    setSaveStatus('saved');
  };

  const handleDeleteNote = async (noteId: string) => {
    setSaveStatus('saving');
    const updatedNotes = await deleteNote(book.id, noteId);
    setNotes(updatedNotes);
    setSaveStatus('saved');
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowRight') changePage(1);
    if (event.key === 'ArrowLeft') changePage(-1);
    if (event.key === 'Escape') onClose();
  }, [numPages]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Swipe Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    
    // Disable swipe if zoomed in
    if (scale > 1.1) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    
    // Only trigger if horizontal swipe is dominant
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe && pageNumber < numPages) changePage(1);
      if (isRightSwipe && pageNumber > 1) changePage(-1);
    }
  };

  // Intersection Observer for Scroll Mode - Handled by LazyPage now
  // But we still need to update pageNumber when scrolling
  const handlePageInView = useCallback((page: number) => {
    setPageNumber(page);
  }, []);

  const isBookmarked = bookmarks.includes(pageNumber);
  const currentNotes = notes.filter(n => n.page === pageNumber);

  const getPageWidth = () => {
    if (!containerWidth) return undefined;
    if (isAutoFit) return containerWidth;
    return Math.min(containerWidth * scale, 800 * scale);
  };

  const handleSetScale = (newScale: number | ((s: number) => number)) => {
    setIsAutoFit(false);
    setScale(newScale);
    setPageHeights({});
  };

  const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col h-screen w-screen overflow-hidden text-foreground"
    >
      {/* Toolbar (Top) */}
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 bg-card text-card-foreground shadow-md z-10 shrink-0 border-b border-border">
        <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-sm md:text-lg font-medium truncate max-w-[150px] md:max-w-md">{book.title}</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3 h-3" />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: Center Controls */}
        <div className="hidden md:flex items-center gap-4 bg-muted rounded-full px-4 py-2">
          <button 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              min={1} 
              max={numPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(pageInput);
                  if (!isNaN(val) && val >= 1 && val <= numPages) {
                    scrollToPage(val);
                    e.currentTarget.blur();
                  }
                }
              }}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setIsInputFocused(false);
                const val = parseInt(pageInput);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  scrollToPage(val);
                } else {
                  setPageInput(pageNumber.toString());
                }
              }}
              className="w-12 bg-transparent text-center text-sm font-mono focus:outline-none focus:text-primary appearance-none text-foreground"
            />
            <span className="text-sm text-muted-foreground">/ {numPages || '--'}</span>
          </div>

          <button 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= numPages}
            className="p-1 hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop: Slider */}
        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-md mx-4">
           <input
            type="range"
            min={1}
            max={numPages || 1}
            value={pageNumber}
            onChange={(e) => scrollToPage(parseInt(e.target.value))}
            className="w-full h-1 bg-muted-foreground/20 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary/80"
          />
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Desktop: View Mode */}
          <button
            onClick={() => setViewMode(viewMode === 'single' ? 'scroll' : 'single')}
            className="hidden md:block p-2 hover:bg-muted rounded-full transition-colors"
            title={viewMode === 'single' ? "Switch to Continuous Scroll" : "Switch to Single Page"}
          >
            {viewMode === 'single' ? <Rows className="w-5 h-5" /> : <Square className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsAutoFit(!isAutoFit)}
            className={`hidden md:block p-2 rounded-full transition-colors ${isAutoFit ? 'text-primary bg-primary/10' : 'hover:bg-muted'}`}
            title={isAutoFit ? "Reset Width" : "Fit to Width"}
          >
            {isAutoFit ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <div className="hidden md:block w-px h-6 bg-border mx-2"></div>

          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' : 'hover:bg-muted'}`}
            title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-2 rounded-full transition-colors relative ${showNotes ? 'text-primary bg-primary/10' : 'hover:bg-muted'}`}
            title="Notes"
          >
            <StickyNote className="w-5 h-5" />
            {notes.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            )}
          </button>

          <div className="hidden md:block w-px h-6 bg-border mx-2"></div>

          {/* Desktop: Zoom */}
          <button 
            onClick={() => handleSetScale(s => Math.max(0.5, s - 0.1))}
            className="hidden md:block p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="hidden md:block text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => handleSetScale(s => Math.min(2.5, s + 0.1))}
            className="hidden md:block p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* PDF Container */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto flex justify-center p-4 md:p-8 bg-muted/30"
          onClick={() => setShowNotes(false)}
          onTouchStart={viewMode === 'single' ? onTouchStart : undefined}
          onTouchMove={viewMode === 'single' ? onTouchMove : undefined}
          onTouchEnd={viewMode === 'single' ? onTouchEnd : undefined}
        >
          <div className="relative shadow-2xl transition-all duration-300" style={{ transform: showNotes ? 'translateX(-100%) md:translateX(-160px)' : 'none' }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
              </div>
            )}
            
            <Document
              file={book.fileBlob}
              options={options}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('Error loading PDF:', error);
                setLoading(false);
              }}
              loading={
                <div className="flex items-center justify-center h-[50vh] w-full md:h-[800px] md:w-[600px] bg-white">
                  <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center h-[50vh] w-full md:h-[800px] md:w-[600px] bg-white text-red-500 p-4 text-center">
                  <p className="font-semibold mb-2">Failed to load PDF</p>
                  <p className="text-sm text-gray-500">Please try re-uploading the file.</p>
                </div>
              }
            >
              {viewMode === 'single' ? (
                <div className="relative">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pageNumber}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Page 
                        pageNumber={pageNumber} 
                        width={getPageWidth() || 600}
                        scale={scale}
                        devicePixelRatio={pixelRatio}
                        className="shadow-xl"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        onLoadError={(error) => {
                          if (error.message !== 'TextLayer task cancelled') {
                            console.error('Page load error:', error);
                          }
                        }}
                        onRenderError={(error) => {
                          if (error.message !== 'TextLayer task cancelled') {
                            console.error('Page render error:', error);
                          }
                        }}
                      />
                      {/* Indicators for Single View */}
                      {isBookmarked && (
                        <div className="absolute -top-2 right-4 md:right-8 text-yellow-500 drop-shadow-md z-10">
                          <Bookmark className="w-6 h-8 md:w-8 md:h-10 fill-current" />
                        </div>
                      )}
                      {currentNotes.length > 0 && (
                        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10">
                          <div className="bg-yellow-200 text-yellow-800 p-1.5 md:p-2 rounded-lg shadow-md border border-yellow-300 max-w-[150px] md:max-w-[200px]">
                            <p className="text-[10px] md:text-xs font-bold mb-1">Notes:</p>
                            <p className="text-[10px] md:text-xs line-clamp-2">{currentNotes[0].content}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                // Scroll View: Render all pages using LazyPage
                <div className="flex flex-col gap-4 md:gap-8">
                  {Array.from(new Array(numPages), (el, index) => {
                    const pageNum = index + 1;
                    const isPageBookmarked = bookmarks.includes(pageNum);
                    const pageNotes = notes.filter(n => n.page === pageNum);
                    // Preload 4 pages around the current page for smoother scrolling
                    const shouldForceLoad = Math.abs(pageNum - pageNumber) <= 4;
                    
                    return (
                      <LazyPage
                        key={`page_${pageNum}`}
                        pageNumber={pageNum}
                        width={getPageWidth()}
                        scale={scale}
                        onInView={handlePageInView}
                        isBookmarked={isPageBookmarked}
                        onPageLoad={handlePageLoad}
                        initialHeight={pageHeights[pageNum]}
                        hasNotes={pageNotes.length > 0}
                        forceLoad={shouldForceLoad}
                      />
                    );
                  })}
                </div>
              )}
            </Document>
          </div>
        </div>

        {/* Notes Sidebar */}
        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full md:w-80 bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col z-20"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  Notes & Bookmarks
                </h3>
                <button onClick={() => setShowNotes(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Current Page Notes */}
                <section>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Page {pageNumber} (Current)
                  </h4>
                  
                  <div className="space-y-3">
                    {currentNotes.map(note => (
                      <div key={note.id} className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-3 rounded-xl relative group">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-[10px] text-gray-400 mt-2">
                          {new Date(note.date).toLocaleDateString()}
                        </p>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 dark:focus-within:ring-cyan-900/30 transition-all">
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Add a note for this page..."
                        className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none h-20 placeholder:text-gray-400 text-gray-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                      />
                      <div className="flex justify-end mt-2">
                        <button 
                          onClick={handleAddNote}
                          disabled={!newNoteContent.trim()}
                          className="bg-cyan-500 text-white p-1.5 rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* All Bookmarks */}
                {bookmarks.length > 0 && (
                  <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      Bookmarks
                    </h4>
                    <div className="grid grid-cols-4 gap-2">
                      {bookmarks.map(page => (
                        <button
                          key={page}
                          onClick={() => {
                            scrollToPage(page);
                            if (window.innerWidth < 768) setShowNotes(false);
                          }}
                          className={`
                            p-2 rounded-lg text-sm font-medium transition-colors border
                            ${page === pageNumber 
                              ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-400' 
                              : 'bg-white dark:bg-gray-700 border-gray-100 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-cyan-200 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400'}
                          `}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* All Notes List */}
                {notes.length > 0 && (
                  <section>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                      All Notes
                    </h4>
                    <div className="space-y-2">
                      {notes
                        .filter(n => n.page !== pageNumber)
                        .sort((a, b) => a.page - b.page)
                        .map(note => (
                        <div 
                          key={note.id} 
                          onClick={() => {
                            scrollToPage(note.page);
                            if (window.innerWidth < 768) setShowNotes(false);
                          }}
                          className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-3 rounded-xl hover:border-cyan-200 dark:hover:border-cyan-700 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Page {note.page}</span>
                            <span className="text-[10px] text-gray-400">{new Date(note.date).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar (Bottom - Mobile Only) */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-800 shrink-0 z-10 pb-[env(safe-area-inset-bottom)]">
        <button 
          onClick={() => setViewMode(viewMode === 'single' ? 'scroll' : 'single')}
          className="p-2.5 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
        >
          {viewMode === 'single' ? <Rows className="w-5 h-5" /> : <Square className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl px-2 py-1.5 border border-gray-200 dark:border-gray-700">
          <button 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
            className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div 
            className="px-2 min-w-[60px] text-center flex flex-col items-center justify-center leading-none cursor-pointer"
            onClick={() => setIsEditingPage(true)}
          >
            {isEditingPage ? (
              <input
                type="number"
                className="w-12 bg-transparent text-center text-sm font-bold text-gray-900 dark:text-white focus:outline-none appearance-none border-b border-cyan-500"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt(pageInput);
                    if (!isNaN(val) && val >= 1 && val <= numPages) {
                      scrollToPage(val);
                      setIsEditingPage(false);
                    }
                  }
                }}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => {
                  setIsInputFocused(false);
                  setIsEditingPage(false);
                  const val = parseInt(pageInput);
                  if (!isNaN(val) && val >= 1 && val <= numPages) {
                    scrollToPage(val);
                  } else {
                    setPageInput(pageNumber.toString());
                  }
                }}
                autoFocus
              />
            ) : (
              <>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{pageNumber}</span>
                <span className="text-[10px] text-gray-500">of {numPages || '--'}</span>
              </>
            )}
          </div>

          <button 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= numPages}
            className="p-1.5 text-gray-500 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={() => setScale(s => s >= 1.5 ? 1.0 : s + 0.25)}
          className="p-2.5 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors relative"
        >
          {scale > 1.0 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          {scale !== 1.0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[8px] font-bold text-white">
              {Math.round(scale * 10) / 10}x
            </span>
          )}
        </button>
      </div>
    </motion.div>
  );
}
