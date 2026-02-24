import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  // Try direct fetch first
  try {
    const response = await fetch(url, options);
    if (response.ok) return response;
    // If 403/401/429, maybe proxy helps? If 404, proxy won't help.
    if (response.status === 404) return response;
  } catch (e) {
    console.warn(`Direct fetch failed for ${url}, trying proxy...`, e);
  }

  // Try with CORS proxy
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, options);
    if (response.ok) return response;
  } catch (e) {
    console.warn(`Proxy fetch failed for ${url}`, e);
  }

  // Fallback to allorigins
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, options);
    return response;
  } catch (e) {
    console.error(`All fetch attempts failed for ${url}`, e);
    throw new Error('Failed to fetch from all sources');
  }
}
