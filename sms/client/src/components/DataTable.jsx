import { useState, useCallback } from 'react';
import clsx from 'clsx';
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Inbox,
  ArrowUpDown,
} from 'lucide-react';

const DataTable = ({
  columns = [],
  data = [],
  pagination = { page: 1, limit: 10, total: 0 },
  onPageChange,
  onSearch,
  onSort,
  actions = {},
  loading = false,
  title,
  searchable = true,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSearch = useCallback(
    (value) => {
      setSearchValue(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const handleSort = useCallback(
    (column) => {
      if (!column.sortable) return;

      const newDirection =
        sortConfig.key === column.key && sortConfig.direction === 'asc'
          ? 'desc'
          : 'asc';

      setSortConfig({ key: column.key, direction: newDirection });
      onSort?.(column.key, newDirection);
    },
    [sortConfig, onSort]
  );

  const handlePageChange = useCallback(
    (newPage) => {
      if (newPage < 1 || newPage > totalPages) return;
      onPageChange?.(newPage);
    },
    [onPageChange]
  );

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pagination.limit));
  const startItem = (pagination.page - 1) * pagination.limit + 1;
  const endItem = Math.min(pagination.page * pagination.limit, pagination.total || 0);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-card">
      {/* Table Header */}
      {(title || searchable) && (
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
          {searchable && (
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 transition-colors focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={clsx(
                    'px-4 py-3 font-semibold text-gray-600',
                    column.sortable && 'cursor-pointer select-none hover:text-gray-900',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  onClick={() => handleSort(column)}
                >
                  <div
                    className={clsx(
                      'flex items-center gap-1',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end'
                    )}
                  >
                    {column.label}
                    {column.sortable && (
                      <span className="text-gray-400">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {(actions.view || actions.edit || actions.delete) && (
                <th className="px-4 py-3 text-right font-semibold text-gray-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`}>
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-4 py-3">
                      <div className="skeleton-shimmer h-4 w-3/4 rounded" />
                    </td>
                  ))}
                  {(actions.view || actions.edit || actions.delete) && (
                    <td className="px-4 py-3">
                      <div className="skeleton-shimmer ml-auto h-4 w-16 rounded" />
                    </td>
                  )}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={
                    columns.length +
                    (actions.view || actions.edit || actions.delete ? 1 : 0)
                  }
                  className="px-4 py-12 text-center"
                >
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Inbox className="mb-3 h-12 w-12 text-gray-300" />
                    <p className="text-base font-medium text-gray-500">No records found</p>
                    <p className="mt-1 text-sm">
                      {searchValue
                        ? 'Try adjusting your search query'
                        : 'Data will appear here once available'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="table-striped transition-colors hover:bg-gray-50/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={clsx(
                        'px-4 py-3 text-gray-700',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] ?? '—'}
                    </td>
                  ))}
                  {(actions.view || actions.edit || actions.delete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {actions.view && (
                          <button
                            onClick={() => actions.view(row)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {actions.edit && (
                          <button
                            onClick={() => actions.edit(row)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-warning-50 hover:text-warning-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {actions.delete && (
                          <button
                            onClick={() => actions.delete(row)}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && data.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 px-4 py-3 sm:flex-row">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{startItem}</span> to{' '}
            <span className="font-medium text-gray-700">{endItem}</span> of{' '}
            <span className="font-medium text-gray-700">{pagination.total}</span> results
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={clsx(
                'rounded-lg p-1.5 text-gray-500 transition-colors',
                pagination.page <= 1
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-gray-100 hover:text-gray-700'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={clsx(
                  'h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition-colors',
                  pageNum === pagination.page
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className={clsx(
                'rounded-lg p-1.5 text-gray-500 transition-colors',
                pagination.page >= totalPages
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-gray-100 hover:text-gray-700'
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
