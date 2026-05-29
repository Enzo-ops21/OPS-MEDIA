/**
 * Base URL da API (Opção B na Vercel: defina VITE_API_URL no painel).
 * - Vazio: `/api/...` relativo (dev — proxy Vite → :8000).
 * - Preenchido: URL direta do Railway, ex. https://xxx.railway.app/api/...
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/** Monta URL da API. Ex.: apiUrl('/api/folders') */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return API_BASE ? `${API_BASE}${normalized}` : normalized
}
