import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Book } from '../types';
import { addBook } from '../services/db';
import { pdfjs, standardFontDataUrl, cMapUrl, cMapPacked } from '../lib/pdf-worker';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const file = acceptedFiles[0];
      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported');
      }

      // Generate thumbnail
      let coverUrl: string | undefined;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl,
          cMapPacked,
          standardFontDataUrl
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext as any).promise;
          coverUrl = canvas.toDataURL('image/jpeg');
        }
      } catch (coverErr) {
        console.warn('Failed to generate cover:', coverErr);
        // Continue without cover
      }

      const newBook: Book = {
        id: uuidv4(),
        title: file.name.replace('.pdf', ''),
        author: 'Unknown Author', // Could try to extract metadata later
        coverUrl,
        fileBlob: file, // Store the file object directly (it's a Blob)
        progress: 0,
        totalPages: 0, // Will be updated when opened
        format: 'PDF',
        dateAdded: Date.now(),
        bookmarks: [],
        notes: [],
        category: category.trim() || 'Uncategorized',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      // Get total pages if possible
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          cMapUrl,
          cMapPacked,
          standardFontDataUrl
        });
        const pdf = await loadingTask.promise;
        newBook.totalPages = pdf.numPages;
      } catch (e) {
        console.warn('Failed to get page count:', e);
      }

      await addBook(newBook);
      onUploadSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to process file. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onClose, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  } as any);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upload Book</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Fiction, Science, History"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. favorite, to-read, research"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>

            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
              `}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Processing PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-full flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PDF files only (max 50MB)</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <X className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
