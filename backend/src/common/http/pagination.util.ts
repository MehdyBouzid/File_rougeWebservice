export interface PaginationLinks {
  self: string;
  next: string | null;
  prev: string | null;
}

export function buildPaginationLinks(
  basePath: string,
  page: number,
  size: number,
  totalPages: number,
  filters: Record<string, string | undefined> = {},
): PaginationLinks {
  const buildUrl = (targetPage: number): string => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') {
        params.set(key, value);
      }
    }
    params.set('page', String(targetPage));
    params.set('size', String(size));
    return `${basePath}?${params.toString()}`;
  };

  return {
    self: buildUrl(page),
    next: page + 1 < totalPages ? buildUrl(page + 1) : null,
    prev:
      page > 0 && totalPages > 0
        ? buildUrl(Math.min(page - 1, totalPages - 1))
        : null,
  };
}
