"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useGetEmployeesQuery } from "../api";
import { STAFF_ROLES } from "@/lib/constants";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffAssignmentInput } from "../types";

interface Props {
  value: StaffAssignmentInput[];
  onChange: (val: StaffAssignmentInput[]) => void;
}

export function MechanicAssign({ value, onChange }: Props) {
  const t = useTranslations("jobCards");
  const { data: employees = [] } = useGetEmployeesQuery({ active_only: "true" });

  const add = () => {
    onChange([...value, { employee_id: "", role: "" }]);
  };

  const update = (idx: number, field: "employee_id" | "role", val: string) => {
    const next = value.map((a, i) => (i === idx ? { ...a, [field]: val } : a));
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {value.map((assignment, idx) => (
        <AssignmentRow
          key={idx}
          assignment={assignment}
          employees={employees}
          onUpdate={(field, val) => update(idx, field, val)}
          onRemove={() => remove(idx)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {t("assign_staff")}
      </Button>
    </div>
  );
}

interface RowProps {
  assignment: StaffAssignmentInput;
  employees: { id: string; name: string; job_title: string }[];
  onUpdate: (field: "employee_id" | "role", val: string) => void;
  onRemove: () => void;
}

function AssignmentRow({ assignment, employees, onUpdate, onRemove }: RowProps) {
  const [empOpen, setEmpOpen] = React.useState(false);
  const selectedEmp = employees.find((e) => e.id === assignment.employee_id);

  return (
    <div className="flex items-center gap-2 rounded-lg border p-2">
      <Popover open={empOpen} onOpenChange={setEmpOpen}>
        <PopoverTrigger
          disabled={false}
          className="flex flex-1 items-center justify-between truncate rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {selectedEmp ? selectedEmp.name : "Select employee..."}
          <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {employees.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={emp.name}
                    onSelect={() => {
                      onUpdate("employee_id", emp.id);
                      setEmpOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        assignment.employee_id === emp.id ? "opacity-100" : "opacity-0",
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

      <Select value={assignment.role} onValueChange={(v) => onUpdate("role", v || "")}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {STAFF_ROLES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button type="button" onClick={onRemove} className="shrink-0 rounded p-1 hover:bg-muted">
        <X size={16} className="text-muted-foreground" />
      </button>
    </div>
  );
}
