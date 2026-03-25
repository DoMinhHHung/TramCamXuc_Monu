export type ApiResponse<T> = {
  code: number;
  message?: string;
  result: T;
};

export function success<T>(result: T, message = 'Success'): ApiResponse<T> {
  return { code: 1000, message, result };
}

export function error<T = null>(code: number, message: string, result?: T): ApiResponse<T | null> {
  return { code, message, result: (result ?? null) as T | null };
}

const SORT_STUB = { empty: true, sorted: false, unsorted: true };

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  number: number;
  size: number;
  numberOfElements: number;
  empty: boolean;
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: typeof SORT_STUB;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  sort: typeof SORT_STUB;
};

export function makePageResponse<T>({
  content,
  totalElements,
  page,
  size,
}: {
  content: T[];
  totalElements: number;
  page: number;
  size: number;
}): PageResponse<T> {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    content,
    totalElements,
    totalPages,
    first: page <= 0,
    last: totalPages === 0 ? true : page >= totalPages - 1,
    number: page,
    size,
    numberOfElements: content.length,
    empty: content.length === 0,
    pageable: {
      pageNumber: page,
      pageSize: size,
      sort: SORT_STUB,
      offset: page * size,
      paged: true,
      unpaged: false,
    },
    sort: SORT_STUB,
  };
}
