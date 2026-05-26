/**
 * axiosInstance.js
 * Centralized HTTP client for the MediFlow Admin panel.
 *
 * Features:
 *  - Automatically injects Clerk Bearer token on every request.
 *  - Globally handles 401 / 403 by redirecting to "/" (login).
 *  - Single place to change the base URL (dev vs prod).
 *
 * Usage:
 *   import { apiFetch } from "../utils/axiosInstance";
 *   const res = await apiFetch("/api/services/123", { method: "PUT", body: formData });
 */

export const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://medi-flow-backend.onrender.com";

/**
 * Resolve the Clerk JWT token from multiple possible sources.
 * Priority: Clerk window.__clerk (runtime singleton) → localStorage keys.
 *
 * @param {Function|null} getToken - optional useAuth().getToken from a React component
 * @returns {Promise<string|null>}
 */
export async function resolveToken(getToken = null) {
  // 1. Clerk useAuth hook (React component context)
  if (typeof getToken === "function") {
    try {
      const t = await getToken();
      if (t) return t;
    } catch (_) {}
  }

  // 2. Clerk global singleton (works outside React)
  if (window.__clerk) {
    try {
      const t = await window.__clerk.session?.getToken();
      if (t) return t;
    } catch (_) {}
  }

  // 3. localStorage fallback (clerk_token, token, authToken)
  for (const key of ["clerk_token", "token", "authToken"]) {
    const t = localStorage.getItem(key);
    if (t) return t;
  }

  return null;
}

/**
 * Drop-in replacement for fetch() that:
 *  - Prepends API_BASE to relative paths.
 *  - Injects Authorization: Bearer <token>.
 *  - Redirects to "/" on 401/403.
 *
 * @param {string} path - relative API path, e.g. "/api/services/123"
 * @param {RequestInit} options - standard fetch options
 * @param {Function|null} getToken - Clerk getToken from useAuth (optional)
 * @returns {Promise<Response|null>} - null if redirected
 */
export async function apiFetch(path, options = {}, getToken = null) {
  const token = await resolveToken(getToken);

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  // Merge Authorization header — don't override Content-Type for FormData
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    console.error(
      `[apiFetch] ${res.status} on ${url} — redirecting to login.`
    );
    window.location.href = "/";
    return null;
  }

  return res;
}
