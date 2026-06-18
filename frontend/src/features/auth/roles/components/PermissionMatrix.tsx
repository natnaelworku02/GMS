"use client";

import { MODULES, ACTIONS } from "@/lib/constants";
import type { PermissionSet } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type Props = {
  permissions: PermissionSet[];
  onChange: (permissions: PermissionSet[]) => void;
  disabled?: boolean;
};

export function PermissionMatrix({ permissions, onChange, disabled }: Props) {
  function getPerm(module: string): PermissionSet | undefined {
    return permissions.find((p) => p.module === module);
  }

  function toggle(module: string, action: (typeof ACTIONS)[number]) {
    const key = `can_${action}` as const;
    const existing = getPerm(module);
    if (existing) {
      onChange(
        permissions.map((p) =>
          p.module === module ? { ...p, [key]: !p[key] } : p,
        ),
      );
    } else {
      onChange([
        ...permissions,
        {
          module,
          can_create: action === "create" ? true : false,
          can_read: action === "read" ? true : false,
          can_update: action === "update" ? true : false,
          can_delete: action === "delete" ? true : false,
        },
      ]);
    }
  }

  const actionLabels: Record<string, string> = {
    create: "C",
    read: "R",
    update: "U",
    delete: "D",
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="sticky top-0 z-10 h-10 px-4 text-left text-xs font-medium text-muted-foreground backdrop-blur-sm bg-muted/30">
              Module
            </th>
            {ACTIONS.map((action) => (
              <th
                key={action}
                className="sticky top-0 z-10 h-10 w-14 px-2 text-center text-xs font-medium text-muted-foreground backdrop-blur-sm bg-muted/30"
              >
                <span className="hidden sm:inline">{action.charAt(0).toUpperCase() + action.slice(1)}</span>
                <span className="sm:hidden">{actionLabels[action]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULES.map((mod) => {
            const perm = getPerm(mod.key);
            return (
              <tr key={mod.key} className="border-b last:border-0 transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 text-sm capitalize">{mod.key.replace(/_/g, " ")}</td>
                {ACTIONS.map((action) => {
                  const checked = perm ? perm[`can_${action}`] : false;
                  return (
                    <td key={action} className="px-2 py-3 text-center">
                      <label className={cn(
                        "relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors",
                        checked ? "bg-indigo-500" : "bg-muted-foreground/25",
                        disabled && "cursor-not-allowed opacity-40",
                      )}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(mod.key, action)}
                          disabled={disabled}
                          className="peer sr-only"
                        />
                        <span className={cn(
                          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                          checked ? "translate-x-[18px]" : "translate-x-[3px]",
                        )} />
                      </label>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
