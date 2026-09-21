"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useGetEmployeesQuery } from "../api";
import type { StaffAssignment } from "../types";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const WORK_CATEGORIES = [
  { value: "mechanic", label: "Mechanics" },
  { value: "bat_lamera", label: "Bat Lamera" },
  { value: "strip_and_fit", label: "Strip and Fit Technicians" },
  { value: "auto_electrician", label: "Auto Electricians" },
  { value: "painter", label: "Painters" },
] as const;

interface Props {
  value: StaffAssignment[];
  onChange: (value: StaffAssignment[]) => void;
}

export function MechanicAssign({ value, onChange }: Props) {
  const { data } = useGetEmployeesQuery({ page: 1, page_size: 100, active_only: true });
  const employees = data?.items ?? [];

  const toggle = (employeeId: string, workCategory: string) => {
    const selected = value.some((item) => item.employee_id === employeeId);
    onChange(selected
      ? value.filter((item) => item.employee_id !== employeeId)
      : [...value, { employee_id: employeeId, work_category: workCategory }]);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {WORK_CATEGORIES.map((category) => {
        const choices = employees.filter((employee) => employee.work_category === category.value);
        const selected = value.filter((item) => item.work_category === category.value);
        return (
          <div key={category.value} className="space-y-2">
            <label className="text-sm font-medium">{category.label}</label>
            <Popover>
              <PopoverTrigger className="flex min-h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-left text-sm">
                <span className={cn(!selected.length && "text-muted-foreground")}>
                  {selected.length ? `${selected.length} selected` : `Select ${category.label.toLowerCase()}`}
                </span>
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search employees..." />
                  <CommandEmpty>No employees in this category.</CommandEmpty>
                  <CommandList><CommandGroup>
                    {choices.map((employee) => {
                      const checked = selected.some((item) => item.employee_id === employee.id);
                      return (
                        <CommandItem key={employee.id} value={employee.name} onSelect={() => toggle(employee.id, category.value)}>
                          <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                          {employee.name}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup></CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        );
      })}
    </div>
  );
}
