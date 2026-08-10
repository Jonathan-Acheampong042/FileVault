'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export default function Table({ columns, data, onRowClick = null }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key, sortable) => {
    if (!sortable) return;

    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;

    const aVal = a[sortKey];
    const bVal = b[sortKey];

    if (aVal === bVal) return 0;
    const result = aVal > bVal ? 1 : -1;
    return sortDir === 'asc' ? result : -result;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-primary/10 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="sticky top-0 border-b border-primary/10 bg-accent/40">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key, col.sortable)}
                className={`whitespace-nowrap px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink/60 ${
                  col.sortable ? 'cursor-pointer select-none' : ''
                }`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && (
                    sortKey === col.key
                      ? sortDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                      : <ArrowUpDown size={13} className="opacity-50" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={() => onRowClick && onRowClick(row)}
              className={`border-t border-primary/10 ${
                onRowClick ? 'cursor-pointer hover:bg-accent/30' : 'hover:bg-accent/20'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-5 py-3.5 text-ink">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
