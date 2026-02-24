import { openDB, DBSchema } from 'idb';
import { Book, BookMetadata } from '../types';

interface ZenReaderDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: { 'dateAdded': number };
  };
}

const DB_NAME = 'zen-reader-db';
const STORE_NAME = 'books';

export const initDB = async () => {
  return openDB<ZenReaderDB>(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      store.createIndex('dateAdded', 'dateAdded');
    },
  });
};

export const addBook = async (book: Book) => {
  const db = await initDB();
  return db.put(STORE_NAME, book);
};

export const getAllBooks = async (): Promise<BookMetadata[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const books: BookMetadata[] = [];
  
  let cursor = await store.openCursor();
  while (cursor) {
    const { fileBlob, ...metadata } = cursor.value;
    books.push(metadata);
    cursor = await cursor.continue();
  }
  
  return books.sort((a, b) => b.dateAdded - a.dateAdded);
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  const db = await initDB();
  return db.get(STORE_NAME, id);
};

export const deleteBook = async (id: string) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};

export const clearAllBooks = async () => {
  const db = await initDB();
  return db.clear(STORE_NAME);
};

export const updateBookProgress = async (id: string, progress: number, totalPages: number) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    book.progress = progress;
    book.totalPages = totalPages;
    book.lastRead = Date.now();
    await db.put(STORE_NAME, book);
  }
};

export const toggleBookmark = async (id: string, page: number) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    if (!book.bookmarks) book.bookmarks = [];
    
    if (book.bookmarks.includes(page)) {
      book.bookmarks = book.bookmarks.filter(p => p !== page);
    } else {
      book.bookmarks.push(page);
      book.bookmarks.sort((a, b) => a - b);
    }
    await db.put(STORE_NAME, book);
    return book.bookmarks;
  }
  return [];
};

export const addNote = async (id: string, note: any) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    if (!book.notes) book.notes = [];
    book.notes.push(note);
    await db.put(STORE_NAME, book);
    return book.notes;
  }
  return [];
};

export const updateBookMetadata = async (id: string, updates: Partial<BookMetadata>) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    Object.assign(book, updates);
    await db.put(STORE_NAME, book);
    return book;
  }
  return null;
};

export const deleteNote = async (id: string, noteId: string) => {
  const db = await initDB();
  const book = await db.get(STORE_NAME, id);
  if (book) {
    if (!book.notes) return [];
    book.notes = book.notes.filter(n => n.id !== noteId);
    await db.put(STORE_NAME, book);
    return book.notes;
  }
  return [];
};
