import { http } from './http'
import type { Paginated, Query, Wrapped } from './types'

/** What a list table asks for: the page, its size, and an optional server-side sort. */
export type PageParams = { page: number; per_page: number; sort?: string; direction?: 'asc' | 'desc' }

export type ListParams<TFilters extends Query> = Partial<TFilters> & Partial<PageParams>

/**
 * Typed client for a Laravel `Route::apiResource()` endpoint.
 */
export function createResourceApi<T, TCreate, TUpdate = Partial<TCreate>, TFilters extends Query = Query>(path: string) {
  return {
    list: (params?: ListParams<TFilters>) => http.get<Paginated<T>>(path, params),
    show: (id: number) => http.get<Wrapped<T>>(`${path}/${id}`).then((response) => response.data),
    create: (payload: TCreate) => http.post<Wrapped<T>>(path, payload).then((response) => response.data),
    update: (id: number, payload: TUpdate) => http.patch<Wrapped<T>>(`${path}/${id}`, payload).then((response) => response.data),
    remove: (id: number) => http.delete(`${path}/${id}`),
  }
}
