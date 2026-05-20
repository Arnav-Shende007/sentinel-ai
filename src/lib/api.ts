export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Resolves the full URL for a given API endpoint.
 * In development, falls back to local proxy (e.g. "/api/dashboard").
 * In production, prepends VITE_API_URL if configured.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
