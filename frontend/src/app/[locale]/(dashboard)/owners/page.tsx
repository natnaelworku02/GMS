"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useGetOwnersQuery, useGetVehiclesQuery, useCreateOwnerMutation } from "@/features/jobCards/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
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
import { Plus, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Owner } from "@/features/jobCards/types";

export default function OwnersPage() {
  const t = useTranslations("owners");
  const tc = useTranslations("common");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: owners = [], isLoading } = useGetOwnersQuery();
  const { data: vehicles = [] } = useGetVehiclesQuery();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [create, { isLoading: creating }] = useCreateOwnerMutation();

  const filtered = search
    ? owners.filter(
        (o) =>
          o.name.toLowerCase().includes(search.toLowerCase()) ||
          o.phone.includes(search),
      )
    : owners;

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) return;
    try {
      await create({ name: name.trim(), phone: phone.trim() }).unwrap();
      toast.success(tc("save"));
      setOpen(false);
      setName("");
      setPhone("");
    } catch {
      toast.error(tc("error"));
    }
  };

  const columns: Column<Owner>[] = [
    {
      key: "name",
      header: t("name"),
      render: (o) => <span className="font-medium">{o.name}</span>,
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
      ),
      className: "w-12 text-right",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("title")}
        description={`${owners.length} owner${owners.length !== 1 ? "s" : ""}`}
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
          data={filtered}
          isLoading={isLoading}
          emptyMessage={t("noOwners")}
          searchPlaceholder={t("name") + "..."}
          searchValue={search}
          onSearch={setSearch}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="owner-name">{t("name")}</Label>
              <Input id="owner-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner-phone">{t("phone")}</Label>
              <Input id="owner-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={creating || !name.trim() || !phone.trim()}>
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
