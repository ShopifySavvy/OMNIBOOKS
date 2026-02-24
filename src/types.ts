export interface Note {
  id: string;
  page: number;
  content: string;
  date: number;
  color?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl?: string;
  fileBlob: Blob;
  progress: number;
  totalPages: number;
  format: 'PDF' | 'EPUB' | 'WEB';
  dateAdded: number;
  lastRead?: number;
  bookmarks: number[];
  notes: Note[];
  description?: string;
  publishYear?: number;
  language?: string[];
}

export type BookMetadata = Omit<Book, 'fileBlob'>;
