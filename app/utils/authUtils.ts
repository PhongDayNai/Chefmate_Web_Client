// Authentication utility functions

export interface AuthUser {
  userId: number;
  fullName: string;
  phone?: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";
const REDIRECT_URL_KEY = "redirectUrl";
const CHAT_STORAGE_PREFIXES = ["chatMealSnapshot:", "chatMealLatestSession:"];
const CHAT_STORAGE_KEYS = ["lastChatSessionId", "lastChatUserId"];
const LEGACY_AUTH_KEYS = ["userId", "userName", "userPhone", "userEmail"];

function readStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function readJson<T>(key: string): T | null {
  const storage = readStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function removeKeys(keys: string[]) {
  const storage = readStorage();
  if (!storage) return;

  keys.forEach((key) => storage.removeItem(key));
}

export function normalizeAuthUser(raw: any): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;

  const userId = Number(raw.userId ?? raw.id);
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const fullName = typeof raw.fullName === "string" && raw.fullName.trim() ? raw.fullName.trim() : "";
  return {
    ...raw,
    userId,
    fullName,
    phone: typeof raw.phone === "string" ? raw.phone : undefined,
    email: typeof raw.email === "string" ? raw.email : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
  };
}

export function normalizeAuthSessionPayload(raw: any): AuthSessionPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const accessToken = typeof raw.accessToken === "string" ? raw.accessToken.trim() : "";
  const refreshToken = typeof raw.refreshToken === "string" ? raw.refreshToken.trim() : "";
  const normalizedUser = normalizeAuthUser(raw.user);

  if (accessToken && refreshToken && normalizedUser) {
    return {
      accessToken,
      refreshToken,
      user: normalizedUser,
    };
  }

  const fallbackUser = normalizeAuthUser(raw);
  if (accessToken && refreshToken && fallbackUser) {
    return {
      accessToken,
      refreshToken,
      user: fallbackUser,
    };
  }

  return null;
}

export function persistAuthSession(session: AuthSessionPayload) {
  const storage = readStorage();
  if (!storage) return;

  storage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  storage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
  removeKeys(LEGACY_AUTH_KEYS);
}

export function updateStoredAuthUser(user: Partial<AuthUser> | AuthUser) {
  const currentUser = getAuthUser();
  const mergedUser = normalizeAuthUser({
    ...currentUser,
    ...user,
  });

  if (!mergedUser) return;

  const storage = readStorage();
  if (!storage) return;
  storage.setItem(AUTH_USER_KEY, JSON.stringify(mergedUser));
}

export function getAccessToken(): string | null {
  const storage = readStorage();
  if (!storage) return null;
  const token = storage.getItem(ACCESS_TOKEN_KEY)?.trim();
  return token || null;
}

export function getRefreshToken(): string | null {
  const storage = readStorage();
  if (!storage) return null;
  const token = storage.getItem(REFRESH_TOKEN_KEY)?.trim();
  return token || null;
}

export function getAuthUser(): AuthUser | null {
  return readJson<AuthUser>(AUTH_USER_KEY);
}

export function getAuthUserId(): number | null {
  return getAuthUser()?.userId ?? null;
}

export function checkAuth(): boolean {
  return Boolean(getAccessToken());
}

export function clearAuthSession() {
  const storage = readStorage();
  if (!storage) return;

  removeKeys([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, AUTH_USER_KEY, REDIRECT_URL_KEY, ...LEGACY_AUTH_KEYS, ...CHAT_STORAGE_KEYS]);

  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (CHAT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

/**
 * Save current URL for redirect after login
 * Uses sessionStorage as primary, localStorage as fallback
 */
export function saveRedirectUrl(url: string): void {
  if (!url.startsWith("/")) return;

  try {
    sessionStorage.setItem(REDIRECT_URL_KEY, url);
    readStorage()?.setItem(REDIRECT_URL_KEY, url);
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
    let redirectUrl = sessionStorage.getItem(REDIRECT_URL_KEY);
    if (redirectUrl) {
      sessionStorage.removeItem(REDIRECT_URL_KEY);
      readStorage()?.removeItem(REDIRECT_URL_KEY);
      return redirectUrl;
    }

    redirectUrl = readStorage()?.getItem(REDIRECT_URL_KEY) ?? null;
    if (redirectUrl) {
      readStorage()?.removeItem(REDIRECT_URL_KEY);
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
    readStorage()?.removeItem(REDIRECT_URL_KEY);
  } catch (error) {
    console.error("Failed to clear redirect URL:", error);
  }
}
