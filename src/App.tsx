import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { BookCard } from './components/BookCard';
import { Reader } from './components/Reader';
import { UploadModal } from './components/UploadModal';
import { Discover } from './components/Discover';
import { ConfirmModal } from './components/ConfirmModal';
import { Book, BookMetadata } from './types';
import { getAllBooks, getBook, deleteBook, updateBookProgress, clearAllBooks } from './services/db';
import { Search, Filter, Menu, BookOpen, Moon, Sun, WifiOff, Trash2, ArrowUpDown, LayoutGrid, List } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from './context/ThemeContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';

export default function App() {
  const [activeTab, setActiveTab] = useState<'library' | 'discover' | 'settings'>('library');
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pdf' | 'epub' | 'web'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'author'>('recent');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const isOnline = useOnlineStatus();

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

  const loadBooks = async () => {
    setIsLoading(true);
    try {
      const loadedBooks = await getAllBooks();
      setBooks(loadedBooks);
    } catch (error) {
      console.error("Failed to load books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const handleBookClick = async (id: string) => {
    try {
      const book = await getBook(id);
      if (book) {
        setCurrentBook(book);
      }
    } catch (error) {
      console.error("Failed to open book:", error);
    }
  };

  const confirmDeleteBook = (id: string) => {
    setBookToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await deleteBook(bookToDelete);
      await loadBooks();
    } catch (error) {
      console.error("Failed to delete book:", error);
    } finally {
      setIsDeleteModalOpen(false);
      setBookToDelete(null);
    }
  };

  const handleClearAllBooks = async () => {
    try {
      await clearAllBooks();
      await loadBooks();
    } catch (error) {
      console.error("Failed to clear all books:", error);
    } finally {
      setIsClearAllModalOpen(false);
    }
  };

  const handleToggleReadStatus = async (id: string, currentProgress: number, totalPages: number) => {
    try {
      const newProgress = currentProgress === totalPages ? 0 : totalPages;
      await updateBookProgress(id, newProgress, totalPages);
      await loadBooks();
    } catch (error) {
      console.error("Failed to update book status:", error);
    }
  };

  const filteredAndSortedBooks = useMemo(() => {
    let result = books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filter === 'all' || book.format.toLowerCase() === filter;
      return matchesSearch && matchesFilter;
    });

    return result.sort((a, b) => {
      if (sortBy === 'recent') return b.dateAdded - a.dateAdded;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      return 0;
    });
  }, [books, searchQuery, filter, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }} 
        onUploadClick={() => {
          setIsUploadOpen(true);
          setIsMobileMenuOpen(false);
        }}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white">OMNIBOOKS</span>
        </div>
        <button 
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Offline Banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500 text-white text-center text-sm py-1 px-4 font-medium flex items-center justify-center gap-2 overflow-hidden"
          >
            <WifiOff className="w-4 h-4" />
            You are currently offline. Some features may be unavailable.
          </motion.div>
        )}
      </AnimatePresence>

      <main className="md:pl-64 min-h-screen transition-all duration-300">
        <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
          
          {/* Header Section */}
          <header className="mb-8 md:mb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                {activeTab === 'library' && 'My Library'}
                {activeTab === 'discover' && 'Discover'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              
              {activeTab === 'library' && (
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative group flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Search titles, authors..." 
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm text-gray-900 dark:text-white placeholder-gray-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Sort Dropdown */}
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm text-sm font-medium">
                      <ArrowUpDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Sort</span>
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-20 hidden group-hover:block">
                      {(['recent', 'title', 'author'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setSortBy(s)}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortBy === s ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                        >
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Tabs */}
            {activeTab === 'library' && (
              <div className="flex items-center gap-1 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
                {(['all', 'pdf', 'epub', 'web'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`
                      px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                      ${filter === f 
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}
                    `}
                  >
                    {f === 'all' ? 'All Books' : f.toUpperCase() + 's'}
                  </button>
                ))}
              </div>
            )}
          </header>

          {/* Content Grid */}
          {activeTab === 'library' ? (
            <>
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredAndSortedBooks.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredAndSortedBooks.map((book) => (
                      <motion.div
                        key={book.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <BookCard 
                          book={book} 
                          onClick={handleBookClick}
                          onDelete={confirmDeleteBook}
                          onToggleRead={handleToggleReadStatus}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Your library is empty</h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-8">
                    Upload your first PDF to get started reading or discover free books.
                  </p>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-cyan-200 dark:shadow-cyan-900/30"
                    >
                      Upload Book
                    </button>
                    <button 
                      onClick={() => setActiveTab('discover')}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-xl font-medium transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Discover Books
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'discover' ? (
            <Discover 
              onBookAdded={() => {
                loadBooks();
              }} 
              onOpenBook={handleBookClick}
            />
          ) : activeTab === 'settings' ? (
            <div className="max-w-2xl mx-auto">
              {/* Settings content */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customize how OMNIBOOKS looks on your device.</p>
                </div>
                
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Dark Mode</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={toggleTheme}
                      className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2
                        ${theme === 'dark' ? 'bg-cyan-500' : 'bg-gray-200'}
                      `}
                    >
                      <span
                        className={`
                          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                          ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">Clear Library</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Delete all books and data. This cannot be undone.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setIsClearAllModalOpen(true)}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg">This section is coming soon.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadSuccess={loadBooks} 
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteBook}
        title="Delete Book"
        message="Are you sure you want to delete this book? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
      />

      <ConfirmModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleClearAllBooks}
        title="Clear Library"
        message="Are you sure you want to delete ALL books? This action cannot be undone and will remove all your books, bookmarks, and notes."
        confirmLabel="Clear All"
        isDestructive={true}
      />

      <AnimatePresence>
        {currentBook && (
          <Reader 
            book={currentBook} 
            onClose={() => {
              setCurrentBook(null);
              loadBooks(); // Refresh progress
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
