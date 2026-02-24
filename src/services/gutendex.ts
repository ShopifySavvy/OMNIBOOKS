export interface GutendexBook {
  id: number;
  title: string;
  authors: { name: string; birth_year: number | null; death_year: number | null }[];
  formats: { [mimeType: string]: string };
  download_count: number;
  languages: string[];
  media_type: string;
  subjects: string[];
  bookshelves: string[];
}

export interface GutendexResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutendexBook[];
}

const API_URL = 'https://gutendex.com/books';

export const searchGutendexBooks = async (query: string): Promise<GutendexBook[]> => {
  try {
    const targetUrl = `${API_URL}?search=${encodeURIComponent(query)}`;
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data: GutendexResponse = await response.json();
    
    // Filter for books that have PDF format
    // Note: Gutendex PDF links are often under 'application/pdf'
    return data.results.filter(book => book.formats['application/pdf']);
  } catch (error) {
    console.error('Error searching Gutendex:', error);
    return [];
  }
};

export const getGutendexCover = (book: GutendexBook) => {
  return book.formats['image/jpeg'];
};

export const getGutendexDownloadLink = (book: GutendexBook) => {
  return book.formats['application/pdf'];
};
