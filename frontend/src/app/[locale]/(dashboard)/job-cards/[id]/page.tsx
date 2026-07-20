"use client";

import { useState, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetJobCardQuery, useUpdateJobCardStatusMutation, useGetOwnerQuery, useGetVehicleQuery, useGetEmployeesQuery } from "@/features/jobCards/api";
import { useGetToolCheckoutsQuery, useGetToolsQuery, useCheckoutToolMutation, useReturnToolMutation } from "@/features/tools/api";
import { useGetPerformasQuery } from "@/features/performas/api";
import { useUseInventoryMutation } from "@/features/jobCards/api";
import { useGetInventoryItemsQuery, useGetInventoryLocationsQuery } from "@/features/inventory/api";
import { PerformaStatusBadge } from "@/features/performas/components/PerformaStatusBadge";
import { useGetUsersQuery } from "@/features/auth/api";
import { StatusTimeline } from "@/features/jobCards/components/StatusTimeline";
import { ConditionWizard } from "@/features/jobCards/components/ConditionWizard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Loader2, Clock, User, Wrench, Receipt, Plus, Undo2, Package } from "lucide-react";
import { toast } from "sonner";
import { JOB_STATUS_LABELS, JOB_STATUS_TRANSITIONS } from "@/lib/constants";
import { toolCheckoutSchema } from "@/lib/formSchemas";
import { z } from "zod";
type CheckoutFormData = z.input<typeof toolCheckoutSchema>;
import type { VehicleConditionInput } from "@/features/jobCards/types";

export default function JobCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("jobCards");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: jobCard, isLoading } = useGetJobCardQuery(id);
  const { data: usersResp } = useGetUsersQuery({ page: 1, page_size: 100 });
  const users = usersResp?.items ?? [];
  const { data: owner } = useGetOwnerQuery(jobCard?.owner_id || "", { skip: !jobCard?.owner_id });
  const { data: vehicle } = useGetVehicleQuery(jobCard?.vehicle_id || "", { skip: !jobCard?.vehicle_id });
  const { data: employeesResp } = useGetEmployeesQuery({ page: 1, page_size: 100, active_only: true });
  const employees = employeesResp?.items ?? [];
  const { data: unreturnedCheckoutsResp } = useGetToolCheckoutsQuery(
    { page: 1, page_size: 100, job_card_id: id, unreturned_only: true },
  );
  const unreturnedCheckouts = unreturnedCheckoutsResp?.items ?? [];
  const { data: linkedPerformasResp } = useGetPerformasQuery(
    { page: 1, page_size: 100, job_card_id: id },
  );
  const linkedPerformas = linkedPerformasResp?.items ?? [];
  const [updateStatus, { isLoading: isTransitioning }] = useUpdateJobCardStatusMutation();
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: allCheckoutsResp } = useGetToolCheckoutsQuery(
    { page: 1, page_size: 100, job_card_id: id },
  );
  const allCheckouts = allCheckoutsResp?.items ?? [];
  const { data: toolsResp } = useGetToolsQuery({ page: 1, page_size: 100 });
  const tools = toolsResp?.items ?? [];
  const [checkoutTool, { isLoading: isCheckingOut }] = useCheckoutToolMutation();
  const [returnTool, { isLoading: isReturning }] = useReturnToolMutation();
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutToolId, setCheckoutToolId] = useState("");
  const [checkoutEmployeeId, setCheckoutEmployeeId] = useState("");
  const [checkoutQty, setCheckoutQty] = useState(1);

  const { data: inventoryItemsResp } = useGetInventoryItemsQuery({ page: 1, page_size: 200 });
  const inventoryItems = inventoryItemsResp?.items ?? [];
  const { data: locationsResp } = useGetInventoryLocationsQuery({ page: 1, page_size: 200 });
  const invLocations = locationsResp?.items ?? [];
  const [useInventory, { isLoading: isUsingInventory }] = useUseInventoryMutation();
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invItemId, setInvItemId] = useState("");
  const [invLocationId, setInvLocationId] = useState("");
  const [invQty, setInvQty] = useState(1);

  const openConfirm = (status: string) => {
    setConfirmStatus(status);
    setDialogOpen(true);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
  if (!jobCard) return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <p className="text-sm text-muted-foreground">{t("notFound")}</p>
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft size={15} />
        {tc("back")}
      </Button>
    </div>
  );

  const validTransitions = JOB_STATUS_TRANSITIONS[jobCard.status] || [];
  const canComplete = jobCard.status === "ready_for_testing" && unreturnedCheckouts.length === 0;
  const blockedByTools = jobCard.status === "ready_for_testing" && unreturnedCheckouts.length > 0;
  const itemName = (itemId: string) =>
    inventoryItems.find((i) => i.id === itemId)?.part_name || itemId.slice(0, 8);
  const locationName = (locId: string) =>
    invLocations.find((l) => l.id === locId)?.name || locId.slice(0, 8);

  const handleUseInventory = async () => {
    if (!invItemId || !invLocationId || invQty < 1) return;
    try {
      await useInventory({ job_card_id: id, body: { item_id: invItemId, store_location_id: invLocationId, quantity: invQty } }).unwrap();
      toast.success("Inventory used");
      setInvDialogOpen(false);
      setInvItemId("");
      setInvLocationId("");
      setInvQty(1);
    } catch {
      toast.error("Failed to use inventory");
    }
  };

  const toolName = (toolId: string) =>
    tools.find((t) => t.id === toolId)?.name || toolId.slice(0, 8);
  const employeeName = (empId: string) =>
    employees.find((e) => e.id === empId)?.name || empId;

  const handleCheckout = async () => {
    if (!checkoutToolId || !checkoutEmployeeId) return;
    try {
      await checkoutTool({
        tool_id: checkoutToolId,
        employee_id: checkoutEmployeeId,
        job_card_id: id,
        quantity: checkoutQty,
      }).unwrap();
      toast.success("Tool checked out");
      setCheckoutDialogOpen(false);
      setCheckoutToolId("");
      setCheckoutEmployeeId("");
      setCheckoutQty(1);
    } catch {
      toast.error("Failed to checkout tool");
    }
  };

  const handleReturnTool = async (checkoutId: string) => {
    try {
      await returnTool(checkoutId).unwrap();
      toast.success("Tool returned");
    } catch {
      toast.error("Failed to return tool");
    }
  };

  const conditionsInput: VehicleConditionInput[] = jobCard.conditions.map((c) => ({
    part_name: c.part_name,
    condition_state: c.condition_state,
  }));
  const creator = users.find((u) => u.id === jobCard.created_by);

  const handleStatusChange = async () => {
    if (!confirmStatus) return;
    try {
      await updateStatus({ id, status: confirmStatus }).unwrap();
    } catch {
      // handled by RTK
    }
    setDialogOpen(false);
    setConfirmStatus(null);
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/job-cards")}>
          <ArrowLeft size={15} />
          {t("backToList")}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/job-cards/${id}/edit`)}>
            <Pencil size={14} />
            {tc("edit")}
          </Button>
          {validTransitions.length > 0 && (
            <div className="flex gap-2">
              {validTransitions.map((nextStatus) => (
                <Button
                  key={nextStatus}
                  size="sm"
                  onClick={() => openConfirm(nextStatus)}
                  disabled={isTransitioning || (nextStatus === "completed" && !canComplete)}
                  title={blockedByTools ? t("returnToolsFirst") : ""}
                >
                  {isTransitioning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {JOB_STATUS_LABELS[nextStatus]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {vehicle?.model || "Vehicle"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {vehicle?.plate_number}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={jobCard.status} />
            <span className="text-sm font-medium">
              {jobCard.mileage_km.toLocaleString()} km
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User size={12} />
            {t("createdBy", { name: creator?.full_name || jobCard.created_by })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {new Date(jobCard.created_at).toLocaleDateString()}
          </span>
          {jobCard.updated_at !== jobCard.created_at && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {t("updated")} {new Date(jobCard.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="mb-6 rounded-xl border bg-card p-6 shadow-sm">
        <StatusTimeline currentStatus={jobCard.status} />
      </div>

      {/* Info grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("owner")}</h2>
          <p className="text-sm">{owner?.name || tc("loading")}</p>
          <p className="text-xs text-muted-foreground">{owner?.phone}</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("vehicle")}</h2>
          <p className="text-sm">{vehicle?.model}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{t("plateNumber")}: {vehicle?.plate_number}</span>
            <span className="font-mono">{t("engineNumber")}: {vehicle?.engine_number}</span>
            <span className="font-mono">{t("chassisNumber")}: {vehicle?.chassis_number}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("details")}</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("mileage")}</span>
              <span className="font-medium">{jobCard.mileage_km.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("status")}</span>
              <StatusBadge status={jobCard.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("privatePaint")}</span>
              <span>{jobCard.private_paint ? tc("yes") : tc("no")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("privateMechanic")}</span>
              <span>{jobCard.private_mechanic ? tc("yes") : tc("no")}</span>
            </div>
            {jobCard.insurance_provider && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("insuranceProvider")}</span>
                <span>{jobCard.insurance_provider}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold">{t("mechanics")}</h2>
          {jobCard.mechanics.length > 0 ? (
            <div className="space-y-2">
              {jobCard.mechanics.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.job_title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{m.phone}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noMechanics")}</p>
          )}
        </div>
      </div>

      {/* Tool Checkouts */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Wrench size={14} />
            {t("toolCheckouts")}
          </h2>
          <Button size="sm" variant="outline" onClick={() => setCheckoutDialogOpen(true)}>
            <Plus size={14} />
            Checkout
          </Button>
        </div>
        {allCheckouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tools checked out</p>
        ) : (
          <div className="divide-y divide-border">
            {allCheckouts.map((co) => (
              <div key={co.id} className="flex items-center justify-between py-2 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{toolName(co.tool_id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {employeeName(co.employee_id)} &middot; Qty: {co.quantity} &middot; {new Date(co.checked_out_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {co.checked_in_at ? (
                    <span className="text-xs text-emerald-600">Returned {new Date(co.checked_in_at).toLocaleDateString()}</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => handleReturnTool(co.id)} disabled={isReturning}>
                      {isReturning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 size={14} />}
                      Return
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {blockedByTools && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {t("returnToolsFirst")} ({unreturnedCheckouts.length} {t("unreturnedTools")})
          </div>
        )}
      </div>

      {/* Inventory Usage */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Package size={14} />
            Inventory Used
          </h2>
          <Button size="sm" variant="outline" onClick={() => setInvDialogOpen(true)}>
            <Plus size={14} />
            Use Item
          </Button>
        </div>
        {(!jobCard.inventory_usage || jobCard.inventory_usage.length === 0) ? (
          <p className="text-sm text-muted-foreground">No inventory used</p>
        ) : (
          <div className="divide-y divide-border">
            {jobCard.inventory_usage.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="font-medium">{itemName(u.item_id)}</span>
                  <span className="text-xs text-muted-foreground ml-2">({locationName(u.store_location_id)})</span>
                </div>
                <span className="font-medium">-{u.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performas */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Receipt size={14} />
            {t("performas")}
          </h2>
          <Button size="sm" variant="outline" onClick={() => router.push(`/performas/new?job_card_id=${id}`)}>
            <Plus size={14} />
            {tc("create")}
          </Button>
        </div>
        {linkedPerformas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPerformas")}</p>
        ) : (
          <div className="space-y-2">
            {linkedPerformas.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/performas/${p.id}`)}
              >
        <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">v{p.version}</span>
                  <PerformaStatusBadge status={p.status} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB" }).format(p.grand_total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">{t("description")}</h2>
        <p className="text-sm">{jobCard.description}</p>
        {jobCard.remarks && (
          <>
            <h3 className="text-xs font-medium text-muted-foreground">{t("remarks")}</h3>
            <p className="text-sm text-muted-foreground">{jobCard.remarks}</p>
          </>
        )}
        {jobCard.requested_materials && (
          <>
            <h3 className="text-xs font-medium text-muted-foreground">{t("requestedMaterials")}</h3>
            <p className="text-sm text-muted-foreground">{jobCard.requested_materials}</p>
          </>
        )}
      </div>

      {/* Conditions */}
      <div className="mb-6 rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold">{t("conditions")}</h2>
        <ConditionWizard conditions={conditionsInput} onChange={() => {}} readOnly />
      </div>

      {/* Inventory Usage Dialog */}
      <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select value={invItemId} onValueChange={(v) => setInvItemId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.part_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={invLocationId} onValueChange={(v) => setInvLocationId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {invLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={invQty} onChange={(e) => setInvQty(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleUseInventory} disabled={isUsingInventory || !invItemId || !invLocationId || invQty < 1}>
              {isUsingInventory && <Loader2 className="h-4 w-4 animate-spin" />}
              Use
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout Tool</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tool</Label>
              <Select value={checkoutToolId} onValueChange={(v) => setCheckoutToolId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tool..." />
                </SelectTrigger>
                <SelectContent>
                  {tools.filter((t) => t.available_quantity > 0).map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.name} ({tool.available_quantity} avail.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employee</Label>
              <Select value={checkoutEmployeeId} onValueChange={(v) => setCheckoutEmployeeId(v || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} value={checkoutQty} onChange={(e) => setCheckoutQty(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleCheckout} disabled={isCheckingOut || !checkoutToolId || !checkoutEmployeeId}>
              {isCheckingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`${t("confirmStatusChange")} "${confirmStatus ? JOB_STATUS_LABELS[confirmStatus] : ""}"?`}
        description={tc("cannotUndo")}
        confirmLabel={tc("confirm")}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
