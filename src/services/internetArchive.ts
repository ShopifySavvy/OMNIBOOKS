export interface IABook {
  identifier: string;
  title: string;
  creator?: string | string[];
  description?: string;
  date?: string;
  language?: string;
  downloads?: number;
  format?: string[];
  subject?: string | string[];
}

export interface IAResponse {
  responseHeader: {
    status: number;
    QTime: number;
  };
  response: {
    numFound: number;
    start: number;
    docs: IABook[];
  };
}

const API_URL = 'https://archive.org/advancedsearch.php';

export const searchIABooks = async (query: string): Promise<IABook[]> => {
  try {
    // Construct advanced search query
    // q: (title:query OR creator:query) AND mediatype:texts AND format:pdf
    // AND NOT collection:openlibrary (to avoid duplicates with Open Library search)
    const q = `(${query}) AND mediatype:texts AND format:pdf AND NOT collection:openlibrary`;
    const params = new URLSearchParams({
      q: q,
      fl: 'identifier,title,creator,description,date,language,downloads,format,subject',
      sort: 'downloads desc',
      rows: '20',
      page: '1',
      output: 'json'
    });

    const targetUrl = `${API_URL}?${params.toString()}`;
    const response = await fetch(`/api/proxy?url=${encodeURIComponent(targetUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data: IAResponse = await response.json();
    return data.response.docs;
  } catch (error) {
    console.error('Error searching Internet Archive:', error);
    return [];
  }
};

export const getIACoverUrl = (id: string) => `https://archive.org/services/img/${id}`;
export const getIAPdfUrl = (id: string) => `https://archive.org/download/${id}/${id}.pdf`; // This is a guess, usually correct but sometimes filename differs.
// Better to use metadata API to find exact filename, but for search results we can just use the download link logic we already have in Discover.tsx (which fetches metadata).
