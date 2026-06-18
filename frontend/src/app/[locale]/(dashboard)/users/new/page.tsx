"use client";

import { useRouter } from "@/i18n/navigation";
import { useCreateUserMutation } from "@/features/auth/api";
import { UserForm } from "@/features/auth/users/components/UserForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { CreateUserFormData } from "@/features/auth/users/schemas";

export default function NewUserPage() {
  const router = useRouter();
  const [createUser, { isLoading }] = useCreateUserMutation();

  const onSubmit = async (data: CreateUserFormData) => {
    await createUser({
      full_name: data.full_name,
      phone: data.phone,
      password: data.password,
      role_id: data.role_id,
    }).unwrap();
    router.push("/users");
  };

  return (
    <div className="mx-auto max-w-lg">
      <Button variant="ghost" onClick={() => router.push("/users")} className="mb-6">
        <ArrowLeft size={15} />
        Back to Users
      </Button>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New User</h1>
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <UserForm onSubmit={onSubmit} isSubmitting={isLoading} mode="create" />
      </div>
    </div>
  );
}
