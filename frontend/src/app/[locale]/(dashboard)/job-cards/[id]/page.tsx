"use client";

import { useRef, useState, use } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useGetJobCardQuery, useGetJobCardHistoryQuery, useUpdateJobCardStatusMutation, useGetOwnerQuery, useGetVehicleQuery, useGetEmployeesQuery } from "@/features/jobCards/api";
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
import type { VehicleConditionInput } from "@/features/jobCards/types";
import { WORK_CATEGORIES } from "@/features/jobCards/components/MechanicAssign";

export default function JobCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const t = useTranslations("jobCards");
  const tc = useTranslations("common");
  const router = useRouter();
  const { data: jobCard, isLoading } = useGetJobCardQuery(id);
  const { data: history } = useGetJobCardHistoryQuery(id);
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

  const { data: inventoryItemsResp } = useGetInventoryItemsQuery({ page: 1, page_size: 100 });
  const inventoryItems = inventoryItemsResp?.items ?? [];
  const { data: locationsResp } = useGetInventoryLocationsQuery({ page: 1, page_size: 100 });
  const invLocations = locationsResp?.items ?? [];
  const [applyInventory, { isLoading: isUsingInventory }] = useUseInventoryMutation();
  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const invDialogRef = useRef<HTMLDivElement>(null);
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
      await applyInventory({ job_card_id: id, body: { item_id: invItemId, store_location_id: invLocationId, quantity: invQty } }).unwrap();
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
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
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
      <div className="animate-fade-in-up overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
        <div className="bg-gradient-to-r from-primary/5 to-transparent px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {vehicle?.model || "Vehicle"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground font-mono">
                {vehicle?.plate_number}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={jobCard.status} />
              <span className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                {jobCard.mileage_km.toLocaleString()} km
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <User size={12} />
              {t("createdBy", { name: creator?.full_name || jobCard.created_by })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={12} />
              {new Date(jobCard.created_at).toLocaleDateString()}
            </span>
            {jobCard.updated_at !== jobCard.created_at && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} />
                {t("updated")} {new Date(jobCard.updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="animate-fade-in-up rounded-2xl border border-border/60 bg-card p-6 shadow-card" style={{ animationDelay: "0.05s" }}>
        <StatusTimeline currentStatus={jobCard.status} />
      </div>

      {/* Info grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard title={t("owner")} delay="0.1s" className="space-y-2">
          <p className="text-sm font-medium">{owner?.name || tc("loading")}</p>
          <p className="text-xs text-muted-foreground">{owner?.phone}</p>
        </DetailCard>

        <DetailCard title={t("vehicle")} delay="0.15s" className="space-y-2">
          <p className="text-sm font-medium">{vehicle?.model}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{t("plateNumber")}: {vehicle?.plate_number}</span>
            <span className="font-mono">{t("engineNumber")}: {vehicle?.engine_number}</span>
            <span className="font-mono">{t("chassisNumber")}: {vehicle?.chassis_number}</span>
          </div>
        </DetailCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard title={t("details")} delay="0.2s">
          <div className="space-y-2.5 text-sm">
            <InfoRow label={t("mileage")} value={`${jobCard.mileage_km.toLocaleString()} km`} />
            <InfoRow label={t("status")} value={<StatusBadge status={jobCard.status} />} />
            <InfoRow label={t("privatePaint")} value={jobCard.private_paint ? tc("yes") : tc("no")} />
            <InfoRow label={t("privateMechanic")} value={jobCard.private_mechanic ? tc("yes") : tc("no")} />
            {jobCard.insurance_provider && (
              <InfoRow label={t("insuranceProvider")} value={jobCard.insurance_provider} />
            )}
          </div>
        </DetailCard>

        <DetailCard title="Assigned Staff" delay="0.25s">
          {jobCard.staff_assignments.length > 0 ? (
            <div className="space-y-2">
              {jobCard.staff_assignments.map((assignment) => {
                const employee = employees.find((item) => item.id === assignment.employee_id);
                return employee ? (
                <div key={employee.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{WORK_CATEGORIES.find((category) => category.value === assignment.work_category)?.label ?? assignment.work_category}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{employee.phone}</span>
                </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No staff assigned</p>
          )}
        </DetailCard>
      </div>

      {/* Tool Checkouts */}
      <DetailCard
        title={t("toolCheckouts")}
        icon={Wrench}
        delay="0.3s"
        action={
          <Button size="sm" variant="outline" onClick={() => setCheckoutDialogOpen(true)}>
            <Plus size={14} />
            Checkout
          </Button>
        }
      >
        {allCheckouts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tools checked out</p>
        ) : (
          <div className="divide-y divide-border/40">
            {allCheckouts.map((co) => (
              <div key={co.id} className="flex items-center justify-between py-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{toolName(co.tool_id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {employeeName(co.employee_id)} &middot; Qty: {co.quantity} &middot; {new Date(co.checked_out_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {co.checked_in_at ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Returned {new Date(co.checked_in_at).toLocaleDateString()}
                    </span>
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
          <div className="mt-3 rounded-xl bg-destructive/5 border border-destructive/10 p-3 text-sm text-destructive">
            {t("returnToolsFirst")} ({unreturnedCheckouts.length} {t("unreturnedTools")})
          </div>
        )}
      </DetailCard>

      {/* Inventory Usage */}
      <DetailCard
        title="Inventory Used"
        icon={Package}
        delay="0.35s"
        action={
          <Button size="sm" variant="outline" onClick={() => setInvDialogOpen(true)}>
            <Plus size={14} />
            Use Item
          </Button>
        }
      >
        {(!jobCard.inventory_usage || jobCard.inventory_usage.length === 0) ? (
          <p className="text-sm text-muted-foreground">No inventory used</p>
        ) : (
          <div className="divide-y divide-border/40">
            {jobCard.inventory_usage.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <span className="font-medium">{itemName(u.item_id)}</span>
                  <span className="text-xs text-muted-foreground ml-2">({locationName(u.store_location_id)})</span>
                </div>
                <span className="font-medium text-muted-foreground">-{u.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </DetailCard>

      {/* Performas */}
      <DetailCard
        title={t("performas")}
        icon={Receipt}
        delay="0.4s"
        action={
          <Button size="sm" variant="outline" onClick={() => router.push(`/performas/new?job_card_id=${id}`)}>
            <Plus size={14} />
            {tc("create")}
          </Button>
        }
      >
        {linkedPerformas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPerformas")}</p>
        ) : (
          <div className="space-y-2">
            {linkedPerformas.map((p) => (
              <div
                key={p.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-sm transition-all hover:bg-muted/40 hover:shadow-sm"
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
      </DetailCard>

      {/* Description */}
      <DetailCard title={t("description")} delay="0.45s">
        <p className="text-sm leading-relaxed">{jobCard.description}</p>
        {jobCard.remarks && (
          <>
            <h3 className="mt-3 text-xs font-medium text-muted-foreground">{t("remarks")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{jobCard.remarks}</p>
          </>
        )}
        {jobCard.requested_materials && (
          <>
            <h3 className="mt-3 text-xs font-medium text-muted-foreground">{t("requestedMaterials")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{jobCard.requested_materials}</p>
          </>
        )}
      </DetailCard>

      <DetailCard title="Activity History" icon={Clock} delay="0.48s">
        {!history?.events.length && !history?.inventory_movements.length ? (
          <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
        ) : (
          <div className="border-l pl-4">
            {[...(history?.events ?? []).map((event) => ({
              id: event.id, date: event.created_at, title: event.action.replaceAll("_", " ").replaceAll(".", " · "),
              detail: event.details ? Object.entries(event.details).map(([key, value]) => `${key}: ${String(value)}`).join(" · ") : "",
            })), ...(history?.inventory_movements ?? []).map((movement) => ({
              id: movement.id, date: movement.created_at, title: "Inventory used",
              detail: `${movement.quantity_before} → ${movement.quantity_after} (${movement.quantity_change})`,
            }))].sort((a, b) => b.date.localeCompare(a.date)).map((event) => (
              <div key={event.id} className="relative border-b py-3 last:border-0">
                <span className="absolute -left-[21px] top-4 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-medium capitalize">{event.title}</p>
                {event.detail && <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(event.date).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </DetailCard>

      {/* Conditions */}
      <DetailCard title={t("conditions")} delay="0.5s">
        <ConditionWizard conditions={conditionsInput} onChange={() => {}} readOnly />
      </DetailCard>

      {/* Inventory Usage Dialog */}
      <Dialog open={invDialogOpen} onOpenChange={setInvDialogOpen}>
        <DialogContent ref={invDialogRef}>
          <DialogHeader>
            <DialogTitle>Use Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Item</Label>
              <Select value={invItemId} onValueChange={(v) => setInvItemId(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select item...">
                    {invItemId ? itemName(invItemId) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent container={invDialogRef}>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.part_name}</SelectItem>
                  ))}
                </SelectContent>
                {inventoryItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">No inventory items are available.</p>
                )}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={invLocationId} onValueChange={(v) => setInvLocationId(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location...">
                    {invLocationId ? locationName(invLocationId) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent container={invDialogRef}>
                  {invLocations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
                {invLocations.length === 0 && (
                  <p className="text-xs text-muted-foreground">Create an inventory location before using stock.</p>
                )}
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

function DetailCard({
  title,
  icon: Icon,
  children,
  action,
  delay = "0s",
  className = "",
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
  delay?: string;
  className?: string;
}) {
  return (
    <div
      className="animate-fade-in-up overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card transition-shadow hover:shadow-elevated"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between border-b border-border/40 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon size={15} className="text-muted-foreground/60" />}
          {title}
        </h2>
        {action}
      </div>
      <div className={`px-5 py-4 ${className}`}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
