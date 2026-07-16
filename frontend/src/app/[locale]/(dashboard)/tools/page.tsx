"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetToolsQuery, useCreateToolMutation, useDeleteToolMutation } from "@/features/tools/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
import { Plus, ClipboardList, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toolSchema, type ToolFormData } from "@/lib/formSchemas";
import type { Tool } from "@/features/tools/types";

export default function ToolsPage() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: toolsResp, isLoading } = useGetToolsQuery({ page, page_size: 20, search: search || undefined });
  const tools = toolsResp?.items ?? [];
  const total = toolsResp?.total ?? 0;
  const totalPages = toolsResp?.total_pages ?? 0;

  const [open, setOpen] = useState(false);
  const [create, { isLoading: creating }] = useCreateToolMutation();
  const [deleteTarget, setDeleteTarget] = useState<Tool | null>(null);
  const [deleteTool, { isLoading: deleting }] = useDeleteToolMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTool(deleteTarget.id).unwrap();
      toast.success("Tool deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete tool";
      toast.error(msg);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ToolFormData>({
    resolver: zodResolver(toolSchema),
    defaultValues: { specifications: "", total_quantity: 1 },
  });

  const onCreate = async (data: ToolFormData) => {
    try {
      await create({
        name: data.name.trim(),
        specifications: data.specifications?.trim() || undefined,
        total_quantity: data.total_quantity,
      }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      reset({ specifications: "", total_quantity: 1 });
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
    {
      key: "actions",
      header: "",
      render: (tool) => (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setDeleteTarget(tool);
          }}
        >
          <Trash2 size={14} className="text-destructive" />
        </Button>
      ),
      className: "w-12 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} tool${total !== 1 ? "s" : ""}`}
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
          data={tools}
          isLoading={isLoading}
          emptyMessage={t("noTools")}
          searchPlaceholder={t("name") + "..."}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          onRowClick={(tool) => router.push(`/tools/${tool.id}`)}
        />
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              {tc("previous")}
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {tc("next")}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { reset({ specifications: "", total_quantity: 1 }); } setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tool-name">{t("name")}</Label>
              <Input id="tool-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-specs">{t("specifications")}</Label>
              <Textarea id="tool-specs" rows={2} {...register("specifications")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tool-qty">{t("totalQuantity")}</Label>
              <Input id="tool-qty" type="number" min={1} {...register("total_quantity", { valueAsNumber: true })} />
              {errors.total_quantity && <p className="text-xs text-destructive">{errors.total_quantity.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { reset({ specifications: "", total_quantity: 1 }); setOpen(false); }}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                {creating ? tc("loading") : t("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Delete Tool"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
