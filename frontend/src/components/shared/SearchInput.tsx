"use client";

import { Search, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SearchInput({ value, onChange, placeholder = "Search..." }: Props) {
  return (
    <div className="relative w-full sm:w-auto">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex h-10 w-full rounded-lg border border-border/60 bg-muted/40 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground/40 transition-all focus:border-primary/30 focus:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/10 sm:h-9 sm:w-72 sm:rounded-full"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
