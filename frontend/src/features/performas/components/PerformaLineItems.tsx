"use client";

import { useTranslations } from "next-intl";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LineItemInput } from "../types";

interface Props {
  items: LineItemInput[];
  onChange: (items: LineItemInput[]) => void;
  readOnly?: boolean;
}

export function PerformaLineItems({ items, onChange, readOnly }: Props) {
  const t = useTranslations("performas");

  const update = (idx: number, field: keyof LineItemInput, value: string | number) => {
    const next = items.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, [field]: value };
    });
    onChange(next);
  };

  const add = () => {
    onChange([...items, { type: "labor", description: "", quantity: 1, unit_price: 0 }]);
  };

  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  if (readOnly) {
    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
            <div className="flex-1">
              <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-xs font-medium text-indigo-500">
                {item.type === "labor" ? t("labor") : t("part")}
              </span>
              <span className="ml-2">{item.description}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {item.type !== "labor" && <span>&times;{item.quantity}</span>}
              <span>{fmt(item.unit_price)}</span>
              <span className="font-medium text-foreground">
                {fmt(item.type === "labor" ? item.unit_price : item.quantity * item.unit_price)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <select
                value={item.type}
                onChange={(e) => update(idx, "type", e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="labor">{t("labor")}</option>
                <option value="part">{t("part")}</option>
              </select>
              <input
                placeholder={t("description")}
                value={item.description}
                onChange={(e) => update(idx, "description", e.target.value)}
                className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
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
          <button type="button" onClick={() => remove(idx)} className="mt-1 rounded p-1 hover:bg-muted">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {t("addLineItem")}
      </Button>
    </div>
  );
}
