const clampPageSize = (value, fallback = 25) => Math.min(Math.max(Number(value) || fallback, 1), 100);

const getPagination = (query) => {
  const pageSize = clampPageSize(query.pageSize);
  const page = Math.max(Number(query.page) || 1, 1);
  return { page, pageSize, offset: (page - 1) * pageSize };
};

const getSort = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

module.exports = { clampPageSize, getPagination, getSort };
