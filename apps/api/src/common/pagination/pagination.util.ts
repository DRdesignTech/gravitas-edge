import { PaginatedResult, PaginationMeta, PaginationParams } from './pagination.types';

export { PaginatedResult, PaginationMeta, PaginationParams } from './pagination.types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export function safePage(raw: number | undefined): number {
  return Math.max(1, Math.floor(Number(raw) || DEFAULT_PAGE));
}

export function safeLimit(raw: number | undefined): number {
  const value = Math.floor(Number(raw) || DEFAULT_LIMIT);
  if (value <= 0) return DEFAULT_LIMIT;
  return Math.min(value, MAX_LIMIT);
}

export function buildPaginationParams(pageRaw?: number, limitRaw?: number): PaginationParams {
  const page = safePage(pageRaw);
  const limit = safeLimit(limitRaw);
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPaginationMeta<T>(
  items: T[],
  totalItems: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / params.limit);
  const meta: PaginationMeta = {
    page: params.page,
    limit: params.limit,
    totalItems,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1,
  };
  return { items, meta };
}
