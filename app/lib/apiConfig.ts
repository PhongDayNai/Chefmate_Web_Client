const fallbackBaseUrl = "https://your-api-url.com";

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || fallbackBaseUrl).replace(/\/+$/, "");

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
