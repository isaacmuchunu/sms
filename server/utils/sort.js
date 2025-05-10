const ApiError = require('./ApiError');

const DIRECTIONS = new Set(['ASC', 'DESC']);

/**
 * Parse a single sort token that may use a leading '-' for descending order.
 * @param {string} token
 * @returns {{ field: string, direction: 'ASC'|'DESC' }}
 */
const parseSortToken = (token) => {
  const trimmed = token.trim();
  if (trimmed.startsWith('-')) {
    return { field: trimmed.slice(1), direction: 'DESC' };
  }
  return { field: trimmed, direction: 'ASC' };
};

/**
 * Build a safe SQL ORDER BY clause from request-controlled sort input.
 *
 * Supports two styles:
 *  - Explicit: buildOrderBy('name', 'asc', { name: '"name"' })
 *  - Prefixed tokens: buildOrderBy('-createdAt', undefined, { createdAt: '"created_at"' })
 *    Tokens may be comma or whitespace separated for multi-column sorts.
 *
 * Unknown sort fields or directions throw a 400 ApiError.
 *
 * @param {string|null|undefined} sort - Request sort field(s)
 * @param {string|null|undefined} order - Explicit 'asc' or 'desc'
 * @param {Object.<string, string>} allowlist - Maps request field names to SQL column expressions
 * @param {string} defaultSort - Safe default ORDER BY clause
 * @returns {string}
 */
const buildOrderBy = (sort, order, allowlist, defaultSort = 'created_at DESC') => {
  // Explicit sort + order style (e.g. student sortBy + sortOrder)
  if (sort !== undefined && sort !== null && sort !== '' && order !== undefined && order !== null && order !== '') {
    const normalizedOrder = String(order).toUpperCase();
    if (!DIRECTIONS.has(normalizedOrder)) {
      throw new ApiError('Invalid sort order', 400);
    }
    const column = allowlist[sort];
    if (!column) {
      throw new ApiError('Invalid sort field', 400);
    }
    return `${column} ${normalizedOrder}`;
  }

  if (!sort) {
    return defaultSort;
  }

  const tokens = String(sort).split(/[,\s]+/).filter(Boolean);
  const clauses = [];

  for (const token of tokens) {
    const { field, direction } = parseSortToken(token);
    if (!DIRECTIONS.has(direction)) {
      throw new ApiError('Invalid sort order', 400);
    }
    const column = allowlist[field];
    if (!column) {
      throw new ApiError('Invalid sort field', 400);
    }
    clauses.push(`${column} ${direction}`);
  }

  return clauses.length ? clauses.join(', ') : defaultSort;
};

module.exports = { buildOrderBy };
