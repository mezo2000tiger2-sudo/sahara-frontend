"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormInput } from "@/features/auth/components/form-controls";
import { saveProfile } from "@/features/profile/api";
import { ProfileError } from "@/features/profile/components/profile-error";
import { ProfileApiError } from "@/features/profile/errors";
import { profileQueryOptions } from "@/features/profile/queries";
import type { Profile } from "@/schema/profileSchema";
import { updateProfileSchema, type UpdateProfileInput } from "@/schema/updateProfileSchema";

const fields = ["fName", "lName", "age", "gender", "phone"] as const;

export function UpdateProfileForm() {
  const query = useQuery(profileQueryOptions);
  if (query.isError && !query.data) return <ProfileError message={query.error.message}
    status={query.error instanceof ProfileApiError ? query.error.status : undefined}
    onRetry={() => { void query.refetch(); }} />;
  if (!query.data) return <p role="status" className="text-sm text-ink-muted">Loading profile…</p>;
  return <>
    {query.isError ? <div className="mb-6"><ProfileError message={query.error.message}
      status={query.error instanceof ProfileApiError ? query.error.status : undefined}
      onRetry={() => { void query.refetch(); }} /></div> : null}
    <EditDetailsForm key={query.data._id} profile={query.data} />
  </>;
}

function EditDetailsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, dirtyFields, isDirty } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fName: profile.fName,
      lName: profile.lName,
      age: profile.age ?? undefined,
      gender: profile.gender ?? undefined,
      phone: profile.phone || undefined,
    },
  });
  const mutation = useMutation({
    mutationFn: saveProfile,
    retry: false,
    onSuccess: async () => {
      setRedirecting(true);
      await queryClient.invalidateQueries({ queryKey: profileQueryOptions.queryKey });
      router.push("/profile");
    },
    onError: (error) => {
      if (error instanceof ProfileApiError) {
        for (const detail of error.details ?? []) {
          if (fields.some((field) => field === detail.path)) {
            setError(detail.path as keyof UpdateProfileInput, { type: "server", message: detail.message });
          }
        }
      }
    },
  });
  const busy = mutation.isPending || redirecting;

  function submit(values: UpdateProfileInput) {
    for (const field of ["age", "gender", "phone"] as const) {
      if (dirtyFields[field] && values[field] === undefined && profile[field] != null && profile[field] !== "") {
        setError(field, { message: "Enter a new value to change this detail." }, { shouldFocus: true });
        return;
      }
    }
    const changes: UpdateProfileInput = Object.fromEntries(
      Object.entries(values).filter(([field, value]) => dirtyFields[field as keyof UpdateProfileInput] && value !== undefined),
    );
    mutation.mutate(changes);
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} aria-busy={busy} className="space-y-6 rounded-2xl border border-outline bg-surface p-5 sm:p-8">
      {mutation.error ? <Alert variant="destructive" className="wrap-anywhere">{mutation.error.message}</Alert> : null}
      <fieldset disabled={busy} className="space-y-6">
        <legend className="sr-only">Personal details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormInput label="First name" autoComplete="given-name" registration={register("fName")} error={errors.fName?.message} />
          <FormInput label="Last name" autoComplete="family-name" registration={register("lName")} error={errors.lName?.message} />
        </div>
        <Field>
          <FieldLabel htmlFor="profile-email">Email address</FieldLabel>
          <Input id="profile-email" type="email" value={profile.email} readOnly aria-describedby="profile-email-description" />
          <p id="profile-email-description" className="text-sm text-ink-muted">Your email address cannot be changed here.</p>
        </Field>
        <FormInput label="Age" type="number" min={18} max={120} step="any"
          registration={register("age", { setValueAs: (value) => value === "" ? undefined : Number(value) })} error={errors.age?.message} />
        <Field data-invalid={Boolean(errors.gender)}>
          <FieldLabel htmlFor="profile-gender">Gender</FieldLabel>
          <select id="profile-gender" {...register("gender", { setValueAs: (value) => value === "" ? undefined : value })}
            className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base text-ink outline-none focus-visible:ring-3 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-disabled"
            aria-invalid={Boolean(errors.gender)} aria-describedby={errors.gender ? "profile-gender-error" : undefined}>
            <option value="" disabled={Boolean(profile.gender)}>Not provided</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          {errors.gender ? <FieldError id="profile-gender-error">{errors.gender.message}</FieldError> : null}
        </Field>
        <FormInput label="Phone number" type="tel" autoComplete="tel"
          registration={register("phone", { setValueAs: (value) => value === "" ? undefined : value })} error={errors.phone?.message} />
      </fieldset>
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button type="submit" disabled={busy || !isDirty} className="sm:flex-1">{busy ? <LoadingSpinner /> : null}Save changes</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => router.push("/profile")}>Cancel</Button>
      </div>
    </form>
  );
}
