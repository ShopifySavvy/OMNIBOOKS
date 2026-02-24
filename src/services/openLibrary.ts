import { fetchWithProxy } from '../lib/utils';

const SEARCH_API_URL = 'https://openlibrary.org/search.json';

export interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  ia?: string[];
  ebook_access?: string;
  first_publish_year?: number;
  language?: string[];
}

export interface SearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  docs: OpenLibraryBook[];
}

export const searchBooks = async (query: string, page: number = 1): Promise<SearchResponse> => {
  try {
    const response = await fetchWithProxy(
      `${SEARCH_API_URL}?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,ia,first_publish_year,language,ebook_access&limit=20&page=${page}`
    );
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    
    if (!data.docs) {
      return { numFound: 0, start: 0, numFoundExact: true, docs: [] };
    }

    // Filter out items without IA identifiers (needed for download)
    // And ensure they are public domain (ebook_access === 'public')
    data.docs = data.docs.filter((doc: OpenLibraryBook) => 
      doc.ia && 
      doc.ia.length > 0 && 
      doc.ebook_access === 'public'
    );
    return data;
  } catch (error) {
    console.error('Error searching books:', error);
    throw error;
  }
};

export const getTrendingBooks = async (): Promise<OpenLibraryBook[]> => {
  // Fetch some classic/popular books to show initially
  return searchBooks('classic fiction', 1).then(res => res.docs);
};

export const getCoverUrl = (coverId?: number, size: 'S' | 'M' | 'L' = 'M') => {
  if (!coverId) return undefined;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
};

export const getPdfUrl = (iaId: string) => {
  return `https://archive.org/download/${iaId}/${iaId}.pdf`;
};

export const getBookDescription = async (key: string): Promise<string | undefined> => {
  try {
    const response = await fetchWithProxy(`https://openlibrary.org${key}.json`);
    if (!response.ok) return undefined;
    
    const data = await response.json();
    
    if (typeof data.description === 'string') {
      return data.description;
    } else if (data.description && typeof data.description.value === 'string') {
      return data.description.value;
    }
    
    return undefined;
  } catch (error) {
    console.warn('Failed to fetch book description:', error);
    return undefined;
  }
};
