"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetOwnersQuery, useGetVehiclesQuery, useCreateOwnerMutation, useDeleteOwnerMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/features/auth/components/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ownerSchema, type OwnerFormData } from "@/lib/formSchemas";
import type { Owner } from "@/features/jobCards/types";

export default function OwnersPage() {
  const t = useTranslations("owners");
  const tc = useTranslations("common");
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: ownersResp, isLoading } = useGetOwnersQuery({ page, page_size: 20, search: search || undefined });
  const { data: vehiclesResp } = useGetVehiclesQuery({ page: 1, page_size: 100 });
  const owners = ownersResp?.items ?? [];
  const vehicles = vehiclesResp?.items ?? [];
  const total = ownersResp?.total ?? 0;
  const totalPages = ownersResp?.total_pages ?? 0;

  const [open, setOpen] = useState(false);
  const [create, { isLoading: creating }] = useCreateOwnerMutation();
  const [deleteTarget, setDeleteTarget] = useState<Owner | null>(null);
  const [deleteOwner, { isLoading: deleting }] = useDeleteOwnerMutation();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOwner(deleteTarget.id).unwrap();
      toast.success("Owner deleted");
      setDeleteTarget(null);
    } catch (error) {
      const msg = (error as any)?.data?.detail || "Failed to delete owner";
      toast.error(msg);
    }
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
  });

  const onCreate = async (data: OwnerFormData) => {
    try {
      await create({ name: data.name.trim(), phone: data.phone.trim() }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      reset();
    } catch {
      toast.error(tc("error"));
    }
  };

  const columns: Column<Owner>[] = [
    {
      key: "name",
      header: t("name"),
      render: (o) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 text-xs font-semibold text-indigo-500">
            {o.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </span>
          <span className="font-medium">{o.name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "phone",
      header: t("phone"),
      render: (o) => <span className="text-muted-foreground">{o.phone}</span>,
    },
    {
      key: "vehicles",
      header: t("vehicles"),
      render: (o) => {
        const count = vehicles.filter((v) => v.owner_id === o.id).length;
        return (
          <span className="text-sm text-muted-foreground">
            {count > 0 ? `${count} vehicle${count !== 1 ? "s" : ""}` : t("noVehicles")}
          </span>
        );
      },
    },
    {
      key: "created_at",
      header: t("registered"),
      render: (o) => (
        <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "",
      render: (o) => (
        <div className="flex items-center justify-end gap-1">
          <Can permission="job_cards.update">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                router.push(`/owners/${o.id}`);
              }}
            >
              <Pencil size={14} />
            </Button>
          </Can>
          <Can permission="job_cards.delete">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setDeleteTarget(o);
              }}
            >
              <Trash2 size={14} className="text-destructive" />
            </Button>
          </Can>
        </div>
      ),
      className: "w-20 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${total} owner${total !== 1 ? "s" : ""}`}
        action={
          <Can permission="job_cards.create">
            <Button onClick={() => setOpen(true)}>
              <Plus size={15} />
              {t("create")}
            </Button>
          </Can>
        }
      />
      <div className="mt-6">
        <DataTable<Owner>
          columns={columns}
          data={owners}
          isLoading={isLoading}
          emptyMessage={t("noOwners")}
          searchPlaceholder={t("name") + "..."}
          searchValue={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
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

      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name">{t("name")}</Label>
              <Input id="owner-name" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-phone">{t("phone")}</Label>
              <Input id="owner-phone" {...register("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { reset(); setOpen(false); }}>{tc("cancel")}</Button>
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
        title="Delete Owner"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onConfirm={handleDelete}
        variant="destructive"
        disableConfirm={deleting}
      />
    </div>
  );
}
