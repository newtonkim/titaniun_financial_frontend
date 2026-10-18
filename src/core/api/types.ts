/** Decimal amounts are serialized by the backend as strings to avoid float rounding. */
export type Money = string
/** Y-m-d */
export type ISODate = string
/** ISO 8601 date-time */
export type ISODateTime = string

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  path: string
  per_page: number
  to: number | null
  total: number
}

export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

/** Shape of a Laravel API resource collection, paginated or not. */
export interface Collection<T> {
  data: T[]
  meta?: PaginationMeta
  links?: PaginationLinks
}

export interface Paginated<T> extends Collection<T> {
  meta: PaginationMeta
  links: PaginationLinks
}

/** Shape of a single Laravel API resource. */
export interface Wrapped<T> {
  data: T
}

export type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>
