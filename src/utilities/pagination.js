const DEFAULT_PER_PAGE = 50;
const MAX_PER_PAGE = 100;

export const parsePagination = (query = {}, {
  defaultPerPage = DEFAULT_PER_PAGE,
  maxPerPage = MAX_PER_PAGE
} = {}) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const requestedPerPage = Number.parseInt(query.perPage, 10) || defaultPerPage;
  const perPage = Math.min(Math.max(requestedPerPage, 1), maxPerPage);
  const offset = (page - 1) * perPage;

  return {
    page,
    perPage,
    limit: perPage,
    offset
  };
};

export const buildPagination = ({
  page,
  perPage,
  totalItems,
  basePath,
  query = {}
}) => {
  const total = Math.max(Number(totalItems) || 0, 0);
  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);

  return {
    page: safePage,
    perPage,
    totalItems: total,
    totalPages,
    hasPrevious: safePage > 1,
    hasNext: safePage < totalPages,
    basePath,
    query
  };
};
