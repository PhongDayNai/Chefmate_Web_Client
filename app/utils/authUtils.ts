// Authentication utility functions

export interface AuthUser {
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
}

const REDIRECT_URL_KEY = "redirectUrl";

/**
 * Check if user is currently authenticated
 */
export function checkAuth(): boolean {
  const userId = localStorage.getItem("userId");
  return !!userId;
}

/**
 * Get authenticated user data from localStorage
 */
export function getAuthUser(): AuthUser | null {
  const userId = localStorage.getItem("userId");
  if (!userId) return null;

  return {
    userId,
    userName: localStorage.getItem("userName") || "",
    userPhone: localStorage.getItem("userPhone") || undefined,
    userEmail: localStorage.getItem("userEmail") || undefined,
  };
}

/**
 * Save current URL for redirect after login
 * Uses sessionStorage as primary, localStorage as fallback
 */
export function saveRedirectUrl(url: string): void {
  // Validate that URL is internal (starts with /)
  if (!url.startsWith("/")) {
    return;
  }

  try {
    // Save to both sessionStorage (primary) and localStorage (fallback)
    sessionStorage.setItem(REDIRECT_URL_KEY, url);
    localStorage.setItem(REDIRECT_URL_KEY, url);
  } catch (error) {
    console.error("Failed to save redirect URL:", error);
  }
}

/**
 * Get and clear the saved redirect URL
 * Prioritizes sessionStorage, falls back to localStorage
 */
export function getAndClearRedirectUrl(): string | null {
  try {
    // Try sessionStorage first
    let redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
    if (redirectUrl) {
      sessionStorage.removeItem(REDIRECT_URL_KEY);
      localStorage.removeItem(REDIRECT_URL_KEY);
      return redirectUrl;
    }

    // Fallback to localStorage
    redirectUrl = localStorage.getItem(REDIRECT_URL_KEY);
    if (redirectUrl) {
      localStorage.removeItem(REDIRECT_URL_KEY);
      return redirectUrl;
    }

    return null;
  } catch (error) {
    console.error("Failed to get redirect URL:", error);
    return null;
  }
}

/**
 * Clear any saved redirect URL
 */
export function clearRedirectUrl(): void {
  try {
    sessionStorage.removeItem(REDIRECT_URL_KEY);
    localStorage.removeItem(REDIRECT_URL_KEY);
  } catch (error) {
    console.error("Failed to clear redirect URL:", error);
  }
}
