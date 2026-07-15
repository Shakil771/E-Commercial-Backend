/**
 * Builds pagination metadata and Mongoose query options (skip/limit)
 * from Express request query parameters.
 *
 * @param {import('express').Request['query']} query
 * @param {object} [defaults]
 * @param {number} [defaults.page=1]
 * @param {number} [defaults.limit=12]
 * @param {number} [defaults.maxLimit=100]
 */
export const getPaginationParams = (query, defaults = {}) => {
  const { page: defaultPage = 1, limit: defaultLimit = 12, maxLimit = 100 } = defaults;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = defaultPage;
  if (!Number.isInteger(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds a standardized pagination meta object for API responses.
 *
 * @param {number} totalItems
 * @param {number} page
 * @param {number} limit
 */
export const buildPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.max(Math.ceil(totalItems / limit), 1);

  return {
    totalItems,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
