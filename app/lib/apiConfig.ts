const fallbackBaseUrl = "https://your-api-url.com";
const fallbackChatApiToken = "sk-tao-deo-cho-chat";

export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL || fallbackBaseUrl).replace(/\/+$/, "");

export const CHAT_API_TOKEN =
  (process.env.NEXT_PUBLIC_CHAT_API_TOKEN || fallbackChatApiToken).trim();

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
