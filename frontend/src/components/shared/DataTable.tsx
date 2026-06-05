"use client";

import { useState } from "react";
import { SearchInput } from "./SearchInput";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  onRowClick?: (row: T) => void;
  actions?: React.ReactNode;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T = any>({
  columns,
  data,
  isLoading,
  isError,
  emptyMessage,
  searchPlaceholder,
  onSearch,
  searchValue,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = (a as Record<string, unknown>)[sortKey];
    const bVal = (b as Record<string, unknown>)[sortKey];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-sm text-destructive">
        Failed to load data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(onSearch || actions) && (
        <div className="flex items-center gap-3">
          {onSearch && (
            <SearchInput
              value={searchValue || ""}
              onChange={onSearch}
              placeholder={searchPlaceholder}
            />
          )}
          {actions && <div className="ml-auto">{actions}</div>}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`h-10 px-4 text-left text-xs font-medium text-muted-foreground ${
                    col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""
                  } ${col.hideOnMobile ? "hidden sm:table-cell" : ""} ${col.className || ""}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${sortDir === "desc" ? "rotate-180" : ""}`}
                      >
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                    >
                      <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState message={emptyMessage || "No results"} />
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={((row as Record<string, unknown>).id as string) || String(i)}
                  className={`border-b last:border-0 transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm ${col.hideOnMobile ? "hidden sm:table-cell" : ""} ${col.className || ""}`}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
