import { pdfjs } from 'react-pdf';

// @ts-expect-error - Vite specific import
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use local worker for offline support
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

console.log('PDF Worker initialized with source:', workerUrl);

// Define standard fonts and CMap URLs for use in Document options
// Ensure these paths match where vite-plugin-static-copy puts them
export const standardFontDataUrl = '/standard_fonts/';
export const cMapUrl = '/cmaps/';
export const cMapPacked = true;

export { pdfjs };
