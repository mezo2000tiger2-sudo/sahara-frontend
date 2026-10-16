"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Alert } from "@/components/ui/alert";
import { FormInput, SubmitButton } from "@/features/auth/components/form-controls";
import { savePassword } from "@/features/profile/api";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import { updatePasswordFormSchema, type UpdatePasswordFormInput } from "@/schema/updatePasswordSchema";

export function UpdatePasswordForm() {
  const query = useQuery(profileQueryOptions);
  if (query.isError && !query.data) return <ProfileError message={query.error.message}
    status={query.error instanceof ProfileApiError ? query.error.status : undefined}
    onRetry={() => { void query.refetch(); }} />;
  if (!query.data) return <p role="status" className="text-sm text-ink-muted">Loading profile…</p>;
  if (query.data.providor !== "system") {
    return <Alert role="status">Manage your password through {query.data.providor === "google" ? "Google" : "GitHub"}.</Alert>;
  }
  return <>
    {query.isError ? <div className="mb-6"><ProfileError message={query.error.message}
      status={query.error instanceof ProfileApiError ? query.error.status : undefined}
      onRetry={() => { void query.refetch(); }} /></div> : null}
    <PasswordForm key={query.data._id} />
  </>;
}

function PasswordForm() {
  const queryClient = useQueryClient();
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, setError, formState: { errors } } = useForm<UpdatePasswordFormInput>({
    resolver: zodResolver(updatePasswordFormSchema),
    defaultValues: { oldpassword: "", newpassword: "", cPassword: "" },
  });
  const mutation = useMutation({
    mutationFn: savePassword,
    retry: false,
    onSuccess: async (result) => {
      setRedirecting(true);
      await queryClient.cancelQueries();
      queryClient.clear();
      const search = result.logoutError ? `?${new URLSearchParams({ error: "ProfileLogoutError", code: result.logoutError })}` : "";
      window.location.replace(`/signin${search}`);
    },
    onError: (error) => {
      if (error instanceof ProfileApiError) {
        for (const detail of error.details ?? []) {
          if (detail.path === "oldpassword" || detail.path === "newpassword") {
            setError(detail.path, { type: "server", message: detail.message });
          }
        }
      }
    },
  });
  const busy = mutation.isPending || redirecting;

  return (
    <form noValidate onSubmit={handleSubmit(({ oldpassword, newpassword }) => mutation.mutate({ oldpassword, newpassword }))}
      aria-busy={busy} className="space-y-6 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
      {mutation.error ? <Alert variant="destructive" className="wrap-anywhere">{mutation.error.message}</Alert> : null}
      <fieldset disabled={busy} className="space-y-6">
        <legend className="sr-only">Change your password</legend>
        <FormInput label="Current password" type="password" autoComplete="current-password" disabled={busy}
          registration={register("oldpassword")} error={errors.oldpassword?.message} />
        <FormInput label="New password" type="password" autoComplete="new-password" disabled={busy}
          registration={register("newpassword")} error={errors.newpassword?.message} />
        <FormInput label="Confirm new password" type="password" autoComplete="new-password" disabled={busy}
          registration={register("cPassword")} error={errors.cPassword?.message} />
      </fieldset>
      <SubmitButton pending={busy}>Save password and sign out</SubmitButton>
    </form>
  );
}
