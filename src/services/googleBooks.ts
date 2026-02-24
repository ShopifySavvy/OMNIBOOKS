export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    language?: string;
    description?: string;
  };
  accessInfo: {
    pdf?: {
      isAvailable: boolean;
      downloadLink?: string;
      acsTokenLink?: string;
    };
    webReaderLink?: string;
    accessViewStatus?: string;
  };
}

export interface GoogleBooksResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBook[];
}

const API_URL = 'https://www.googleapis.com/books/v1/volumes';

export const searchGoogleBooks = async (query: string): Promise<GoogleBook[]> => {
  try {
    // Search for free ebooks that are downloadable
    const targetUrl = `${API_URL}?q=${encodeURIComponent(query)}&filter=free-ebooks&printType=books&maxResults=20`;
    
    // Use proxy to avoid CORS/network issues
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
    
    if (!response.ok) {
      throw new Error(`Google Books API failed: ${response.status} ${response.statusText}`);
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    if (!data.items) {
      return [];
    }

    // Filter for books that have direct PDF download link available
    // We cannot handle ACSM files (Adobe DRM) in the browser
    return data.items.filter(item => 
      item.accessInfo?.pdf?.isAvailable && 
      item.accessInfo.pdf.downloadLink
    );
  } catch (error) {
    console.error('Error searching Google Books:', error);
    return [];
  }
};

export const getGoogleBookCover = (book: GoogleBook) => {
  return book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || 
         book.volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:');
};

export const getGoogleBookDownloadLink = (book: GoogleBook) => {
  return book.accessInfo.pdf?.downloadLink;
};
