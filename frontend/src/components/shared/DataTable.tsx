"use client";

import { useState, useMemo } from "react";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

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
  pageSize?: number;
  serverTotal?: number;
  serverPage?: number;
  serverPageSize?: number;
  onServerPageChange?: (page: number) => void;
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
  pageSize = 10,
  serverTotal,
  serverPage,
  serverPageSize,
  onServerPageChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [clientPage, setClientPage] = useState(0);

  const isServerPaged =
    serverTotal !== undefined &&
    serverPage !== undefined &&
    serverPageSize !== undefined &&
    onServerPageChange !== undefined;

  const sorted = useMemo(() => {
    const copy = [...data];
    if (sortKey) {
      copy.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return copy;
  }, [data, sortKey, sortDir]);

  const clientTotalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const displayData = isServerPaged
    ? sorted
    : sorted.slice(clientPage * pageSize, (clientPage + 1) * pageSize);

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
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-12 text-center text-sm text-destructive">
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

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`sticky top-0 z-10 h-10 px-4 text-left text-xs font-medium text-muted-foreground backdrop-blur-sm bg-muted/30 ${
                      col.sortable ? "cursor-pointer select-none hover:text-foreground" : ""
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""} ${col.className || ""}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span className="text-muted-foreground/50">
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )
                          ) : (
                            <ChevronsUpDown size={12} />
                          )}
                        </span>
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
                        <Skeleton className="h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12">
                    <EmptyState message={emptyMessage || "No results"} />
                  </td>
                </tr>
              ) : (
                displayData.map((row, i) => (
                  <tr
                    key={((row as Record<string, unknown>).id as string) || String(i)}
                    className={`border-b last:border-0 transition-all ${
                      i % 2 === 1 ? "bg-muted/20" : ""
                    } ${onRowClick ? "cursor-pointer hover:bg-primary/[0.03] hover:shadow-sm" : "hover:bg-muted/10"}`}
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

      {!isLoading && (
        isServerPaged && (serverTotal! > serverPageSize!) ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {(serverPage! - 1) * serverPageSize! + 1}–
              {Math.min(serverPage! * serverPageSize!, serverTotal!)} of {serverTotal!}
            </span>
            <ServerPagination
              page={serverPage!}
              totalPages={Math.ceil(serverTotal! / serverPageSize!)}
              onChange={onServerPageChange!}
            />
          </div>
        ) : !isServerPaged && sorted.length > pageSize ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {clientPage * pageSize + 1}–
              {Math.min((clientPage + 1) * pageSize, sorted.length)} of {sorted.length}
            </span>
            <ClientPagination
              page={clientPage}
              totalPages={clientTotalPages}
              onChange={setClientPage}
            />
          </div>
        ) : null
      )}
    </div>
  );
}

function ServerPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <PageButton disabled={page <= 1} onClick={() => onChange(page - 1)}>←</PageButton>
      {Array.from({ length: totalPages }, (_, i) => (
        <PageButton key={i} active={i + 1 === page} onClick={() => onChange(i + 1)}>
          {i + 1}
        </PageButton>
      ))}
      <PageButton disabled={page >= totalPages} onClick={() => onChange(page + 1)}>→</PageButton>
    </div>
  );
}

function ClientPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <PageButton disabled={page === 0} onClick={() => onChange(page - 1)}>←</PageButton>
      {Array.from({ length: totalPages }, (_, i) => (
        <PageButton key={i} active={i === page} onClick={() => onChange(i)}>
          {i + 1}
        </PageButton>
      ))}
      <PageButton disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>→</PageButton>
    </div>
  );
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground font-medium"
          : "border bg-card hover:bg-muted"
      } disabled:pointer-events-none disabled:opacity-30`}
    >
      {children}
    </button>
  );
}
