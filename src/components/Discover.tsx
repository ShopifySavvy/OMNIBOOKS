import { useState, useEffect, FormEvent, useRef } from 'react';
import { Search, Download, Loader2, BookOpen, AlertCircle, Check, Play, ExternalLink, WifiOff, MoreVertical, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchBooks, getTrendingBooks, getCoverUrl, getPdfUrl, getBookDescription, OpenLibraryBook } from '../services/openLibrary';
import { searchGoogleBooks, getGoogleBookCover, getGoogleBookDownloadLink, GoogleBook } from '../services/googleBooks';
import { searchGutendexBooks, getGutendexCover, getGutendexDownloadLink, GutendexBook } from '../services/gutendex';
import { searchIABooks, getIACoverUrl, getIAPdfUrl, IABook } from '../services/internetArchive';
import { addBook, deleteBook } from '../services/db';
import { Book } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { pdfjs, standardFontDataUrl, cMapUrl, cMapPacked } from '../lib/pdf-worker';

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface DiscoverProps {
  onBookAdded: () => void;
  onOpenBook: (id: string) => void;
  isOfflineMode?: boolean;
}

type SearchResult = 
  | { type: 'openlibrary'; data: OpenLibraryBook }
  | { type: 'google'; data: GoogleBook }
  | { type: 'gutendex'; data: GutendexBook }
  | { type: 'archive'; data: IABook };

export function Discover({ onBookAdded, onOpenBook, isOfflineMode = false }: DiscoverProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingBookId, setDownloadingBookId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStats, setDownloadStats] = useState<{ loaded: number, total: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [bookErrors, setBookErrors] = useState<Record<string, string>>({});
  const [downloadedBooks, setDownloadedBooks] = useState<Record<string, string>>({}); // Map ID to local Book ID
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSystemOnline = useOnlineStatus();
  const isOnline = isSystemOnline && !isOfflineMode;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteBook = async (bookKey: string) => {
    const localId = downloadedBooks[bookKey];
    if (localId) {
      try {
        await deleteBook(localId);
        setDownloadedBooks(prev => {
          const next = { ...prev };
          delete next[bookKey];
          return next;
        });
        setOpenMenuId(null);
        onBookAdded(); // Refresh library view
      } catch (error) {
        console.error('Failed to delete book:', error);
      }
    }
  };

  // Load trending books on mount
  useEffect(() => {
    if (isOnline) {
      loadTrending();
    }
  }, [isOnline]);

  const loadTrending = async () => {
    setIsLoading(true);
    try {
      const books = await getTrendingBooks();
      setResults(books.map(b => ({ type: 'openlibrary', data: b })));
    } catch (err) {
      console.error("Failed to load trending books", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setSearchError(null);
    setResults([]);

    try {
      const [olData, googleData, gutendexData, iaData] = await Promise.all([
        searchBooks(query).catch(() => ({ docs: [] })),
        searchGoogleBooks(query).catch(() => []),
        searchGutendexBooks(query).catch(() => []),
        searchIABooks(query).catch(() => [])
      ]);

      const olResults: SearchResult[] = olData.docs.map((b: OpenLibraryBook) => ({ type: 'openlibrary' as const, data: b }));
      const googleResults: SearchResult[] = googleData.map((b: GoogleBook) => ({ type: 'google' as const, data: b }));
      const gutendexResults: SearchResult[] = gutendexData.map((b: GutendexBook) => ({ type: 'gutendex' as const, data: b }));
      const iaResults: SearchResult[] = iaData.map((b: IABook) => ({ type: 'archive' as const, data: b }));
      
      const combinedResults = [...olResults, ...googleResults, ...gutendexResults, ...iaResults];

      if (combinedResults.length === 0) {
        setSearchError('No books found. Try a different search term.');
      } else {
        setResults(combinedResults);
      }
    } catch (err) {
      setSearchError('Failed to search books. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [downloadStatus, setDownloadStatus] = useState<'connecting' | 'downloading' | 'processing'>('connecting');

  const handleDownload = async (result: SearchResult) => {
    let bookId: string;
    let pdfUrl: string | undefined;

    if (result.type === 'openlibrary') {
      bookId = result.data.key;
      if (!result.data.ia || result.data.ia.length === 0) return;
      pdfUrl = getPdfUrl(result.data.ia[0]);
    } else if (result.type === 'google') {
      bookId = result.data.id;
      pdfUrl = getGoogleBookDownloadLink(result.data);
    } else if (result.type === 'gutendex') {
      bookId = result.data.id.toString();
      pdfUrl = getGutendexDownloadLink(result.data);
    } else { // archive
      bookId = result.data.identifier;
      pdfUrl = getIAPdfUrl(result.data.identifier);
    }

    if (!pdfUrl) {
       setBookErrors(prev => ({ ...prev, [bookId]: 'PDF not available for this book.' }));
       return;
    }
    
    setDownloadingBookId(bookId);
    setDownloadProgress(0);
    setDownloadStats(null);
    setDownloadStatus('connecting');
    setBookErrors(prev => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });

    // List of proxies to try in order
    const proxies = [
      (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`,
      (url: string) => url, // Direct
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    ];

    let response: Response | null = null;
    let lastError: any = null;

    try {
      // 1. Try to fetch metadata to find the correct PDF filename (OpenLibrary & Archive only)
      if ((result.type === 'openlibrary' && result.data.ia && result.data.ia.length > 0) || result.type === 'archive') {
        const iaId = result.type === 'openlibrary' ? result.data.ia![0] : result.data.identifier;
        try {
          console.log('Fetching metadata for', iaId);
          const metadataUrl = `https://archive.org/metadata/${iaId}`;
          let metadataRes = await fetch(metadataUrl).catch(() => null);
          
          if (!metadataRes || !metadataRes.ok) {
             metadataRes = await fetch(`/api/proxy?url=${encodeURIComponent(metadataUrl)}`).catch(() => null);
          }

          if (metadataRes && metadataRes.ok) {
            const metadata = await metadataRes.json();
            if (metadata.files && Array.isArray(metadata.files)) {
              const pdfFile = metadata.files.find((f: any) => f.format === 'Text PDF') || 
                              metadata.files.find((f: any) => f.format === 'PDF') ||
                              metadata.files.find((f: any) => f.name.endsWith('.pdf'));
              
              if (pdfFile) {
                pdfUrl = `https://archive.org/download/${iaId}/${pdfFile.name}`;
                console.log('Found correct PDF URL from metadata:', pdfUrl);
              }
            }
          }
        } catch (metaErr) {
          console.warn('Failed to fetch metadata, using default URL', metaErr);
        }
      }

      if (!pdfUrl) throw new Error("No PDF URL found");

      // 2. Try proxies sequentially to download the file
      for (let i = 0; i < proxies.length; i++) {
        try {
          const proxyUrl = proxies[i](pdfUrl);
          console.log(`Attempting download with method ${i + 1}...`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); 

          const res = await fetch(proxyUrl, { 
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && (contentType.includes('text/html') || contentType.includes('application/json'))) {
               console.warn(`Method ${i + 1} returned non-PDF content type: ${contentType}`);
               continue;
            }

            response = res;
            break;
          } else {
             console.warn(`Method ${i + 1} failed with status: ${res.status}`);
             lastError = new Error(`Status ${res.status}`);
          }
        } catch (e) {
          console.warn(`Method ${i + 1} failed`, e);
          lastError = e;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('Failed to download book from all available sources');
      }
      
      setDownloadStatus('downloading');
      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        setDownloadStats({ loaded, total });

        if (total > 0) {
          setDownloadProgress(Math.round((loaded / total) * 100));
        } else {
          setDownloadProgress(-1);
        }
      }

      setDownloadStatus('processing');
      const blob = new Blob(chunks, { type: 'application/pdf' });
      
      const headerBuffer = await blob.slice(0, 5).arrayBuffer();
      const header = new TextDecoder().decode(headerBuffer);
      
      if (header !== '%PDF-') {
         console.warn("Downloaded file does not start with %PDF-", header);
         throw new Error('Downloaded file is not a valid PDF');
      }

      if (blob.size < 1000) {
         console.warn("Downloaded file is too small", blob.size);
         throw new Error('Downloaded file is too small to be a valid PDF');
      }

      let totalPages = 0;
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl,
          cMapPacked,
          standardFontDataUrl
        });
        const pdf = await loadingTask.promise;
        totalPages = pdf.numPages;
        
        if (totalPages === 0) {
           console.warn('PDF has 0 pages, but proceeding anyway.');
        }
      } catch (pdfErr) {
        console.warn("PDF verification failed, but proceeding with download:", pdfErr);
      }

      let description: string | undefined;
      let title = '';
      let author = '';
      let coverUrl: string | undefined;
      let publishYear: number | undefined;
      let language: string[] | undefined;

      if (result.type === 'openlibrary') {
        title = result.data.title;
        author = result.data.author_name ? result.data.author_name[0] : 'Unknown Author';
        coverUrl = getCoverUrl(result.data.cover_i, 'L');
        publishYear = result.data.first_publish_year;
        language = result.data.language;
        try {
          description = await getBookDescription(result.data.key);
        } catch (descErr) {
          console.warn('Failed to fetch description:', descErr);
        }
      } else if (result.type === 'google') {
        title = result.data.volumeInfo.title;
        author = result.data.volumeInfo.authors ? result.data.volumeInfo.authors[0] : 'Unknown Author';
        coverUrl = getGoogleBookCover(result.data);
        publishYear = result.data.volumeInfo.publishedDate ? parseInt(result.data.volumeInfo.publishedDate.substring(0, 4)) : undefined;
        language = result.data.volumeInfo.language ? [result.data.volumeInfo.language] : undefined;
        description = result.data.volumeInfo.description;
      } else if (result.type === 'gutendex') {
        title = result.data.title;
        author = result.data.authors.length > 0 ? result.data.authors[0].name : 'Unknown Author';
        coverUrl = getGutendexCover(result.data);
        publishYear = undefined; // Gutendex doesn't provide publish year easily
        language = result.data.languages;
        description = undefined;
      } else { // archive
        title = result.data.title;
        author = Array.isArray(result.data.creator) ? result.data.creator[0] : (result.data.creator || 'Unknown Author');
        coverUrl = getIACoverUrl(result.data.identifier);
        publishYear = result.data.date ? parseInt(result.data.date.substring(0, 4)) : undefined;
        language = result.data.language ? [result.data.language] : undefined;
        description = result.data.description;
      }

      const newBookId = uuidv4();
      const newBook: Book = {
        id: newBookId,
        title: title,
        author: author,
        coverUrl: coverUrl,
        fileBlob: blob,
        progress: 0,
        totalPages: totalPages,
        format: 'PDF',
        dateAdded: Date.now(),
        bookmarks: [],
        notes: [],
        description: description,
        publishYear: publishYear,
        language: language
      };

      await addBook(newBook);
      setDownloadedBooks(prev => ({ ...prev, [bookId]: newBookId }));
      onBookAdded();

    } catch (err) {
      console.error('Download error:', err);
      setBookErrors(prev => ({
        ...prev,
        [bookId]: 'Download failed. Click to retry.'
      }));
    } finally {
      setDownloadingBookId(null);
      setDownloadProgress(0);
      setDownloadStats(null);
      setDownloadStatus('connecting');
    }
  };

  if (!isOnline) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <WifiOff className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-semibold text-foreground mb-2">You are offline</h3>
        <p className="text-lg">Connect to the internet to search and download books.</p>
        <p className="text-sm mt-2">Your downloaded books are available in your Library.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for books, authors, or subjects..."
              className="w-full pl-12 pr-4 py-4 bg-card border border-border rounded-2xl text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-foreground placeholder-muted-foreground"
            />
            <button 
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-6 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-xl font-medium transition-colors"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>
      </div>

      {searchError && (
        <div className="mb-8 p-4 bg-destructive/10 text-destructive rounded-xl flex items-center justify-between gap-2 border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {searchError}
          </div>
        </div>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {results.map((result) => {
            let bookId: string;
            let title: string;
            let author: string;
            let cover: string | undefined;
            let year: number | string | null | undefined;
            let language: string | undefined;
            let sourceLabel: string;

            if (result.type === 'openlibrary') {
              bookId = result.data.key;
              title = result.data.title;
              author = result.data.author_name ? result.data.author_name.join(', ') : 'Unknown Author';
              cover = getCoverUrl(result.data.cover_i, 'M');
              year = result.data.first_publish_year;
              language = result.data.language && result.data.language.length > 0 ? result.data.language[0] : undefined;
              sourceLabel = 'Open Library';
            } else if (result.type === 'google') {
              bookId = result.data.id;
              title = result.data.volumeInfo.title;
              author = result.data.volumeInfo.authors ? result.data.volumeInfo.authors.join(', ') : 'Unknown Author';
              cover = getGoogleBookCover(result.data);
              year = result.data.volumeInfo.publishedDate ? result.data.volumeInfo.publishedDate.substring(0, 4) : undefined;
              language = result.data.volumeInfo.language;
              sourceLabel = 'Google Books';
            } else if (result.type === 'gutendex') {
              bookId = result.data.id.toString();
              title = result.data.title;
              author = result.data.authors.length > 0 ? result.data.authors.map(a => a.name).join(', ') : 'Unknown Author';
              cover = getGutendexCover(result.data);
              year = undefined;
              language = result.data.languages.length > 0 ? result.data.languages[0] : undefined;
              sourceLabel = 'Project Gutenberg';
            } else { // archive
              bookId = result.data.identifier;
              title = result.data.title;
              author = Array.isArray(result.data.creator) ? result.data.creator.join(', ') : (result.data.creator || 'Unknown Author');
              cover = getIACoverUrl(result.data.identifier);
              year = result.data.date ? result.data.date.substring(0, 4) : undefined;
              language = result.data.language;
              sourceLabel = 'Internet Archive';
            }

            return (
            <motion.div
              key={bookId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-4 shadow-sm border border-border flex flex-col h-full"
            >
              <div className="flex gap-4">
                <div className="w-24 h-36 shrink-0 bg-muted rounded-lg overflow-hidden shadow-inner relative">
                  {cover ? (
                    <img
                      src={cover}
                      alt={title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/50">
                      <BookOpen className="w-8 h-8" />
                    </div>
                  )}
                  {/* Source Badge */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 backdrop-blur-sm">
                    {sourceLabel}
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-semibold text-card-foreground line-clamp-2 mb-1" title={title}>
                    {title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                    {author}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4 text-xs text-muted-foreground">
                    {year && (
                      <span className="bg-muted px-2 py-0.5 rounded-md">
                        {year}
                      </span>
                    )}
                    {language && (
                      <span className="bg-muted px-2 py-0.5 rounded-md uppercase">
                        {language}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto space-y-2 relative">
                    {downloadedBooks[bookId] ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onOpenBook(downloadedBooks[bookId])}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-green-500/20"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Open
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === bookId ? null : bookId);
                            }}
                            className="p-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-muted-foreground"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          
                          <AnimatePresence>
                            {openMenuId === bookId && (
                              <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute bottom-full right-0 mb-2 w-48 bg-popover rounded-xl shadow-xl border border-border overflow-hidden z-20"
                              >
                                <button
                                  onClick={() => handleDeleteBook(bookId)}
                                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete from Library
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {bookErrors[bookId] && (
                          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span className="font-medium">{bookErrors[bookId]}</span>
                          </div>
                        )}
                        
                        {downloadingBookId === bookId ? (
                          <div className="w-full bg-muted/50 border border-border rounded-lg p-3">
                            <div className="flex justify-between text-xs mb-2 font-medium text-foreground">
                              <span className="capitalize">{downloadStatus === 'connecting' ? 'Starting...' : downloadStatus === 'processing' ? 'Verifying...' : 'Downloading'}</span>
                              <div className="flex flex-col items-end">
                                <span className="text-primary">{downloadProgress > 0 ? `${downloadProgress}%` : ''}</span>
                                {downloadStats && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {formatBytes(downloadStats.loaded)} {downloadStats.total > 0 ? `/ ${formatBytes(downloadStats.total)}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
                              {downloadProgress <= 0 || downloadStatus === 'connecting' ? (
                                <motion.div 
                                  className="absolute inset-y-0 bg-primary rounded-full w-1/3"
                                  animate={{ left: ['-33%', '100%'] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                              ) : (
                                <motion.div 
                                  className="h-full bg-primary rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ 
                                    width: downloadStatus === 'processing' ? '100%' : `${Math.max(5, downloadProgress)}%` 
                                  }}
                                  transition={{ duration: 0.3 }}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownload(result)}
                            disabled={downloadingBookId !== null}
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors 
                              ${downloadingBookId !== null
                                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                                : bookErrors[bookId]
                                  ? 'bg-card border border-destructive/50 text-destructive hover:bg-destructive/10'
                                  : 'bg-muted hover:bg-primary/10 hover:text-primary text-foreground'
                              }`}
                          >
                            {bookErrors[bookId] ? <Download className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                            {bookErrors[bookId] ? 'Retry Download' : 'Download PDF'}
                          </button>
                        )}
                      </div>
                    )}
                    
                    {result.type === 'openlibrary' && result.data.ia && result.data.ia.length > 0 && (
                      <a
                        href={getPdfUrl(result.data.ia[0])}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Direct Link
                      </a>
                    )}
                    {result.type === 'google' && getGoogleBookDownloadLink(result.data) && (
                      <a
                        href={getGoogleBookDownloadLink(result.data)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Direct Link
                      </a>
                    )}
                    {result.type === 'gutendex' && getGutendexDownloadLink(result.data) && (
                      <a
                        href={getGutendexDownloadLink(result.data)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Direct Link
                      </a>
                    )}
                    {result.type === 'archive' && getIAPdfUrl(result.data.identifier) && (
                      <a
                        href={getIAPdfUrl(result.data.identifier)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Direct Link
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>
      ) : (
        !isLoading && !searchError && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <BookOpen className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">Search for public domain books to add to your library.</p>
            <p className="text-sm mt-2">Powered by Open Library, Internet Archive, Google Books & Project Gutenberg</p>
          </div>
        )
      )}
    </div>
  );
}
