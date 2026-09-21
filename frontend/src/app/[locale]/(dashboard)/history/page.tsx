"use client";

import { useState } from "react";
import { Car, ChevronRight, History, Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useGetVehiclesQuery } from "@/features/jobCards/api";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";

export default function HistoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useGetVehiclesQuery({ page: 1, page_size: 100, search: search || undefined });
  const vehicles = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Vehicle History" description="Find a vehicle and review every recorded visit, mileage, assignment, material, and proforma." />
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search plate, model, engine or chassis number" className="pl-9" />
      </div>

      {isLoading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading history...</p> : vehicles.length === 0 ? (
        <div className="py-14 text-center"><History className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm text-muted-foreground">No matching vehicle history.</p></div>
      ) : (
        <div className="divide-y border-y">
          {vehicles.map((vehicle) => (
            <button key={vehicle.id} onClick={() => router.push(`/vehicles/${vehicle.id}`)} className="flex w-full items-center gap-3 py-4 text-left hover:bg-muted/40">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted"><Car size={17} /></span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{vehicle.model} · {vehicle.plate_number}</span><span className="block truncate text-xs text-muted-foreground">{vehicle.type} · Engine {vehicle.engine_number} · Chassis {vehicle.chassis_number}</span></span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
