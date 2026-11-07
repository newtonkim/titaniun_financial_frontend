import { clearToken, getToken } from '@/core/auth/token'
import type { Query } from './types'

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors: ValidationErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isValidation(): boolean {
    return this.status === 422
  }
}

let unauthorizedHandler: () => void = () => {}

/** Called whenever the backend rejects the stored token (HTTP 401). */
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  query?: Query
  body?: unknown
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin)

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue
    url.searchParams.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  }

  return url.toString()
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = getToken()

  if (token) headers.Authorization = `Bearer ${token}`

  // FormData (file uploads) sets its own multipart boundary header.
  const isForm = options.body instanceof FormData
  if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const response = await fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
  })

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      unauthorizedHandler()
    }

    throw new ApiError(response.status, payload?.message ?? response.statusText, payload?.errors ?? {})
  }

  return payload as T
}

/** Fetch a private file with the same authentication used by JSON requests. */
export async function fetchFile(path: string, query?: Query, signal?: AbortSignal): Promise<Blob> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(buildUrl(path, query), { headers, signal })
  if (!response.ok) {
    if (response.status === 401) {
      clearToken()
      unauthorizedHandler()
    }
    const payload = await response.json().catch(() => null)
    throw new ApiError(response.status, payload?.message ?? response.statusText)
  }

  return response.blob()
}

/** Fetch a file the API serves (e.g. an Excel template) and hand it to the browser as a download. */
export async function download(path: string, filename: string, query?: Query): Promise<void> {
  const url = URL.createObjectURL(await fetchFile(path, query))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}
