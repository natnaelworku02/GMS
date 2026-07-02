"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetToolsQuery, useCreateToolMutation } from "@/features/tools/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Tool } from "@/features/tools/types";

export default function ToolsPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: tools = [], isLoading } = useGetToolsQuery();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [specs, setSpecs] = useState("");
  const [qty, setQty] = useState(1);
  const [create, { isLoading: creating }] = useCreateToolMutation();

  const filtered = useMemo(() => {
    if (!search) return tools;
    const q = search.toLowerCase();
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.specifications?.toLowerCase().includes(q),
    );
  }, [tools, search]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await create({
        name: name.trim(),
        specifications: specs.trim() || undefined,
        total_quantity: qty,
      }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      setName("");
      setSpecs("");
      setQty(1);
    } catch {
      toast.error(tc("error"));
    }
  };

  const columns: Column<Tool>[] = [
    {
      key: "name",
      header: t("name"),
      render: (tool) => <span className="font-medium">{tool.name}</span>,
      sortable: true,
    },
    {
      key: "specifications",
      header: t("specifications"),
      render: (tool) => (
        <span className="text-muted-foreground">{tool.specifications || "—"}</span>
      ),
      hideOnMobile: true,
    },
    {
      key: "total_quantity",
      header: t("totalQuantity"),
      render: (tool) => <span>{tool.total_quantity}</span>,
      sortable: true,
    },
    {
      key: "available_quantity",
      header: t("availableQuantity"),
      render: (tool) => (
        <Badge variant={tool.available_quantity > 0 ? "outline" : "destructive"} className={`font-medium ${tool.available_quantity > 0 ? "text-emerald-600 border-emerald-300 bg-emerald-50" : ""}`}>
          {tool.available_quantity}
        </Badge>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${tools.length} tool${tools.length !== 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/tools/checkouts")}>
              <ClipboardList size={14} />
              {t("checkouts")}
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </div>
        }
      />

      <div className="mt-6">
        <DataTable<Tool>
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noTools")}
          searchPlaceholder={t("name") + "..."}
          searchValue={search}
          onSearch={setSearch}
          onRowClick={(tool) => router.push(`/tools/${tool.id}`)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">{t("name")}</Label>
              <Input id="tool-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-specs">{t("specifications")}</Label>
              <Textarea id="tool-specs" rows={2} value={specs} onChange={(e) => setSpecs(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-qty">{t("totalQuantity")}</Label>
              <Input id="tool-qty" type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
