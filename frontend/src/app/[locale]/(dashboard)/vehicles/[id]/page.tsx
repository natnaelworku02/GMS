"use client";

import { use } from "react";
import { ArrowLeft, Car, FileText, Gauge, Receipt } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useGetVehicleHistoryQuery } from "@/features/jobCards/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";

export default function VehicleHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading } = useGetVehicleHistoryQuery(id);

  if (isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading vehicle history...</div>;
  if (!data) return <div className="py-16 text-center text-sm text-muted-foreground">Vehicle not found.</div>;

  const { vehicle, owner, job_cards: jobs, performas } = data;
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      <Button variant="ghost" onClick={() => router.push("/vehicles")}><ArrowLeft size={16} /> Back to Vehicles</Button>

      <section className="border-b pb-5">
        <div className="flex items-start gap-3">
          <Car className="mt-1 h-5 w-5 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">{vehicle.model} · {vehicle.plate_number}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{owner.name} · {owner.phone}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="text-muted-foreground">Type:</span> {vehicle.type}</p>
          <p><span className="text-muted-foreground">Engine:</span> {vehicle.engine_number}</p>
          <p><span className="text-muted-foreground">Chassis:</span> {vehicle.chassis_number}</p>
          <p><span className="text-muted-foreground">Visits:</span> {jobs.length}</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><FileText size={17} /> Service History</h2>
        {jobs.length === 0 ? <p className="text-sm text-muted-foreground">No job history yet.</p> : (
          <div className="border-l pl-5">
            {jobs.map((job) => (
              <button key={job.id} onClick={() => router.push(`/job-cards/${job.id}`)} className="relative mb-4 block w-full border-b pb-4 text-left">
                <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{job.description}</p><StatusBadge status={job.status} />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><Gauge size={13} /> {job.mileage_km.toLocaleString()} km</span>
                  <span>{job.staff_assignments.length} staff</span>
                  <span>{job.inventory_usage.length} inventory item(s)</span>
                </div>
                {job.remarks && <p className="mt-2 text-sm text-muted-foreground">{job.remarks}</p>}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Receipt size={17} /> Proforma History</h2>
        <div className="space-y-2">
          {performas.length === 0 ? <p className="text-sm text-muted-foreground">No proformas yet.</p> : performas.map((item) => (
            <button key={item.id} onClick={() => router.push(`/performas/${item.id}`)} className="flex w-full items-center justify-between border-b py-3 text-left text-sm">
              <span>Version {item.version} · {new Date(item.created_at).toLocaleDateString()}</span>
              <span className="font-medium">ETB {Number(item.grand_total).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
