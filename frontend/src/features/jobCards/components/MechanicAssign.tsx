"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useGetEmployeesQuery } from "../api";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Props {
  value: string[];
  onChange: (val: string[]) => void;
}

export function MechanicAssign({ value, onChange }: Props) {
  const t = useTranslations("jobCards");
  const { data: employeesResp } = useGetEmployeesQuery({ page: 1, page_size: 100, active_only: true });
  const employees = employeesResp?.items ?? [];
  const [open, setOpen] = React.useState(false);

  const toggle = (empId: string) => {
    if (value.includes(empId)) {
      onChange(value.filter((id) => id !== empId));
    } else {
      onChange([...value, empId]);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="flex w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {value.length > 0
            ? `${value.length} employee(s) selected`
            : "Select mechanics..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search employees..." />
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {employees.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={emp.name}
                    onSelect={() => toggle(emp.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(emp.id) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="flex-1">{emp.name}</span>
                    <span className="text-xs text-muted-foreground">{emp.job_title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
