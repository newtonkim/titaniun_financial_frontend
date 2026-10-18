/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. `/api/v1` (proxied in dev) or `https://api.example.com/api/v1`. */
  readonly VITE_API_BASE_URL?: string
  /** Backend origin the dev server proxies `/api` to. */
  readonly VITE_BACKEND_URL?: string
  /** Shown on the sign-in page under "Need help?". */
  readonly VITE_SUPPORT_PHONE?: string
  readonly VITE_SUPPORT_EMAIL?: string
  /** ISO 4217 code (e.g. UGX) used when formatting amounts; plain numbers when unset. */
  readonly VITE_CURRENCY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
