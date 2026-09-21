"use client";

import { useState, useMemo } from "react";
import { SearchInput } from "./SearchInput";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";

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

export function DataTable<T = unknown>({
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
  const mobileColumns = columns.filter((col) => !col.hideOnMobile);

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
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-12 text-center">
        <p className="text-sm font-medium text-destructive">Failed to load data</p>
        <p className="mt-1 text-xs text-destructive/60">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(onSearch || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onSearch && (
            <SearchInput
              value={searchValue || ""}
              onChange={onSearch}
              placeholder={searchPlaceholder}
            />
          )}
          {actions && <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center">{actions}</div>}
        </div>
      )}

      <div className="hidden overflow-hidden rounded-xl border border-border/60 bg-card shadow-card sm:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] sm:min-w-0">
            <thead>
              <tr className="border-b border-border/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`sticky top-0 z-10 h-11 px-4 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 backdrop-blur-xl bg-muted/30 ${
                      col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""} ${col.className || ""}`}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <span className="text-muted-foreground/40">
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ChevronUp size={13} />
                            ) : (
                              <ChevronDown size={13} />
                            )
                          ) : (
                            <ChevronsUpDown size={13} />
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
                  <tr key={i} className="border-b border-border/30 last:border-0">
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                      >
                        <Skeleton className="h-4 w-full max-w-32 rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16">
                    <EmptyState message={emptyMessage || "No results"} />
                  </td>
                </tr>
              ) : (
                displayData.map((row, i) => (
                  <tr
                    key={((row as Record<string, unknown>).id as string) || String(i)}
                    className={`border-b border-border/30 last:border-0 transition-colors duration-150 ${
                      onRowClick ? "cursor-pointer hover:bg-primary/[0.03]" : "hover:bg-muted/30"
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

      <div className="space-y-3 sm:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-card p-4 shadow-card">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="mt-3 h-3 w-1/2 rounded-md" />
              <Skeleton className="mt-2 h-3 w-2/3 rounded-md" />
            </div>
          ))
        ) : displayData.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card px-4 py-12 shadow-card">
            <EmptyState message={emptyMessage || "No results"} />
          </div>
        ) : (
          displayData.map((row, i) => {
            const rowKey = ((row as Record<string, unknown>).id as string) || String(i);
            const firstColumn = mobileColumns[0] || columns[0];
            const detailColumns = mobileColumns.slice(1, 5);

            return (
              <button
                key={rowKey}
                type="button"
                disabled={!onRowClick}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "w-full rounded-xl border border-border/60 bg-card p-4 text-left shadow-card transition-colors",
                  onRowClick ? "hover:border-primary/30 hover:bg-primary/[0.03]" : "disabled:opacity-100",
                )}
              >
                {firstColumn && (
                  <div className="text-sm font-semibold leading-snug text-foreground">
                    {firstColumn.render(row)}
                  </div>
                )}
                {detailColumns.length > 0 && (
                  <dl className="mt-3 grid gap-2">
                    {detailColumns.map((col) => (
                      <div key={col.key} className="flex items-start justify-between gap-3 text-xs">
                        <dt className="shrink-0 text-muted-foreground">{col.header}</dt>
                        <dd className="min-w-0 text-right text-foreground/85">{col.render(row)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </button>
            );
          })
        )}
      </div>

      {!isLoading && (
        isServerPaged && (serverTotal! > serverPageSize!) ? (
          <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="shrink-0">
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
          <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span className="shrink-0">
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
      <PageButton disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} />
      </PageButton>
      {Array.from({ length: totalPages }, (_, i) => (
        <PageButton key={i} active={i + 1 === page} onClick={() => onChange(i + 1)}>
          {i + 1}
        </PageButton>
      ))}
      <PageButton disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight size={14} />
      </PageButton>
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
      <PageButton disabled={page === 0} onClick={() => onChange(page - 1)}>
        <ChevronLeft size={14} />
      </PageButton>
      {Array.from({ length: totalPages }, (_, i) => (
        <PageButton key={i} active={i === page} onClick={() => onChange(i)}>
          {i + 1}
        </PageButton>
      ))}
      <PageButton disabled={page >= totalPages - 1} onClick={() => onChange(page + 1)}>
        <ChevronRight size={14} />
      </PageButton>
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
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-all duration-150 ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "border border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:pointer-events-none disabled:opacity-30`}
    >
      {children}
    </button>
  );
}
