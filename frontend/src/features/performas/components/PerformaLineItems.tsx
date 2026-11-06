"use client";

import { useLocale, useTranslations } from "next-intl";
import { X, Plus, Package } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LineItemInput } from "../types";
import type { InventoryItem } from "@/features/inventory/types";

interface Props {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  readOnly?: boolean;
  inventoryItems?: InventoryItem[];
}

export function PerformaLineItems({ items, onChange, readOnly, inventoryItems }: Props) {
  const t = useTranslations("performas");
  const locale = useLocale();

  const repaired = items.filter((i) => i.type === "labor");
  const replaced = items.filter((i) => i.type === "part");

  const update = (idx: number, field: keyof LineItemInput, value: string | number) => {
    const next = items.map((item, i) => (i !== idx ? item : { ...item, [field]: value }));
    onChange(next);
  };

  const addItem = (type: "labor" | "part") => {
    onChange([...items, { type, description: "", quantity: 1, unit_price: 0 }]);
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const selectInventoryItem = (idx: number, inv: InventoryItem) => {
    const next = items.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, description: inv.part_name, unit_price: inv.unit_price };
    });
    onChange(next);
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  const renderRow = (item: LineItemInput, idx: number, isReadOnly: boolean) => {
    if (isReadOnly) {
      return (
        <div key={idx} className="grid gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-xs font-medium text-indigo-500">
              {item.type === "labor" ? t("labor") : t("part")}
            </span>
            <span className="ml-2 break-words font-medium">{item.description}</span>
          </div>
          <div className="grid grid-cols-3 items-end gap-3 text-xs text-muted-foreground sm:flex sm:items-center sm:gap-4">
            <span><span className="block text-[10px] uppercase tracking-wide sm:hidden">{t("quantity")}</span>&times;{item.type === "labor" ? 1 : item.quantity}</span>
            <span><span className="block text-[10px] uppercase tracking-wide sm:hidden">{t("unitPrice")}</span>{fmt(item.unit_price)}</span>
            <span className="text-right font-semibold text-foreground">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground sm:hidden">{t("totalPrice")}</span>
              {fmt(item.type === "labor" ? item.unit_price : item.quantity * item.unit_price)}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div key={idx} className="flex items-start gap-2 rounded-xl border border-border/60 p-3">
        <div className="flex-1 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
            <select
              value={item.type}
              onChange={(e) => update(idx, "type", e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="labor">{t("labor")}</option>
              <option value="part">{t("part")}</option>
            </select>
            <div className="relative flex-1">
              <input
                placeholder={t("description")}
                value={item.description}
                onChange={(e) => update(idx, "description", e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 pr-8 text-sm"
              />
              {item.type === "part" && inventoryItems && inventoryItems.length > 0 && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2">
                  <InventoryPicker
                    items={inventoryItems}
                    onSelect={(inv) => selectInventoryItem(idx, inv)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
              {item.type !== "labor" && (
                <div>
                  <Label className="text-xs text-muted-foreground">{t("quantity")}</Label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => update(idx, "quantity", parseInt(e.target.value) || 0)}
                    className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              )}
            <div>
              <Label className="text-xs text-muted-foreground">{t("unitPrice")}</Label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={item.unit_price}
                onChange={(e) => update(idx, "unit_price", parseFloat(e.target.value) || 0)}
                className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="flex items-end pb-1.5">
              <span className="text-sm font-medium">
                {fmt(item.type === "labor" ? item.unit_price : item.quantity * item.unit_price)}
              </span>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => remove(idx)} aria-label={t("removeLineItem")} className="mt-1 rounded p-1 hover:bg-muted">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>
    );
  };

  const renderSection = (titleKey: string, sectionItems: LineItemInput[], sectionType: "labor" | "part", emptyKey: string) => {
    const filtered = items.filter((i) => i.type === sectionType);
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(titleKey)}</h3>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{t(emptyKey)}</p>
        ) : (
          <div className="space-y-1">
            {items.map((item, idx) => {
              if (item.type !== sectionType) return null;
              return renderRow(item, idx, !!readOnly);
            })}
          </div>
        )}
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(sectionType)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {sectionType === "labor" ? (t("addLabor") || "Add labor") : (t("addPart") || "Add part")}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderSection("repairedParts", repaired, "labor", "noRepairedParts")}
      {renderSection("replacedParts", replaced, "part", "noReplacedParts")}
    </div>
  );
}

function InventoryPicker({ items, onSelect }: { items: InventoryItem[]; onSelect: (item: InventoryItem) => void }) {
  const t = useTranslations("performas");
  const locale = useLocale();
  const fmt = (n: number) =>
    new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <Popover>
      <PopoverTrigger
        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        title={t("fromInventory") || "From inventory"}
      >
        <Package size={14} />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder={t("searchInventory") || "Search inventory..."} />
          <CommandEmpty>{t("noInventory") || "No items"}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {items.map((inv) => (
                <CommandItem
                  key={inv.id}
                  value={inv.part_name}
                  onSelect={() => onSelect(inv)}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{inv.part_name}</span>
                    <span className="text-xs text-muted-foreground">{fmt(inv.unit_price)}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
