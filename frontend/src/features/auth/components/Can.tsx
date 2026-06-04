"use client";

import { useAppSelector } from "@/lib/hooks";

function hasPermission(
  isSuperAdmin: boolean,
  permissions: Record<string, boolean>,
  permission: string,
): boolean {
  if (isSuperAdmin) return true;
  return !!permissions[permission];
}

type CanProps = {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function Can({ permission, children, fallback = null }: CanProps) {
  const { isSuperAdmin, permissions } = useAppSelector((s) => s.auth);

  if (hasPermission(isSuperAdmin, permissions, permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

Can.I = function CanInline({
  permission,
  children,
}: {
  permission: string;
  children: (allowed: boolean) => React.ReactNode;
}) {
  const { isSuperAdmin, permissions } = useAppSelector((s) => s.auth);
  return <>{children(hasPermission(isSuperAdmin, permissions, permission))}</>;
};
