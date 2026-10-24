"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useAuthMessage } from "@/context/auth-message-context";
import { signUpFormSchema, type SignUpFormInput } from "@/schema/signupSchema";
import { AvatarField } from "./avatar-field";
import { AuthDivider, FormInput, FormMessage, GoogleButton, GitHubButton, SubmitButton } from "./form-controls";

const signupResponseSchema = z.object({
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
const backendFields = ["fName", "lName", "email", "password", "age", "gender", "phone", "avatar"] as const;

export function SignupForm() {
  const router = useRouter();
  const { setMessage, clearMessage } = useAuthMessage();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<SignUpFormInput>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { fName: "", lName: "", email: "", password: "", cPassword: "" },
  });
  const busy = isSubmitting || googleBusy || githubBusy || redirecting;

  async function submit(values: SignUpFormInput) {
    clearMessage();
    const body = new FormData();
    for (const field of backendFields) {
      const value = values[field];
      if (value !== undefined) body.append(field, value instanceof File ? value : String(value));
    }
    try {
      const response = await fetch("/api/auth/signup", { method: "POST", body });
      const result = signupResponseSchema.safeParse(await response.json().catch(() => null));
      if (response.status === 201 && result.success && !result.data.fieldErrors) {
        setRedirecting(true);
        setMessage({ text: result.data.message, type: "success" });
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      if (result.success) {
        for (const field of backendFields) {
          const error = result.data.fieldErrors?.[field]?.[0];
          if (error) setError(field, { type: "server", message: error }, { shouldFocus: true });
        }
        setMessage({ text: result.data.message, type: "error" });
      } else {
        setMessage({ text: response.statusText, type: "error" });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : String(error), type: "error" });
    }
  }

  return <form noValidate onSubmit={handleSubmit(submit)} className="space-y-6" aria-busy={busy}>
    <FormMessage />
    <GoogleButton disabled={busy} busy={googleBusy} onBusy={setGoogleBusy} onError={(text) => setMessage({ text, type: "error" })} />
    <GitHubButton disabled={busy} busy={githubBusy} onBusy={setGithubBusy} onError={(text) => setMessage({ text, type: "error" })} />
    <AuthDivider />
    <fieldset disabled={busy} className="space-y-6">
      <legend className="sr-only">Create an account with email</legend>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormInput label="First name" autoComplete="given-name" registration={register("fName")} error={errors.fName?.message} />
        <FormInput label="Last name" autoComplete="family-name" registration={register("lName")} error={errors.lName?.message} />
      </div>
      <FormInput label="Email" type="email" autoComplete="email" registration={register("email")} error={errors.email?.message} />
      <FormInput label="Password" type="password" autoComplete="new-password" disabled={busy} registration={register("password")} error={errors.password?.message} />
      <FormInput label="Confirm password" type="password" autoComplete="new-password" disabled={busy} registration={register("cPassword")} error={errors.cPassword?.message} />
      <FormInput label="Age" type="number" min={18} max={120} step="any" registration={register("age", { valueAsNumber: true })} error={errors.age?.message} />
      <Field data-invalid={Boolean(errors.gender)}>
        <FieldLabel htmlFor="auth-gender">Gender <span className="font-normal text-ink-muted">(optional)</span></FieldLabel>
        <select id="auth-gender" {...register("gender", { setValueAs: (value) => value === "" ? undefined : value })}
          className="h-11 w-full rounded-lg border border-input bg-surface px-3 text-base text-ink outline-none focus-visible:ring-3 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-disabled"
          aria-invalid={Boolean(errors.gender)} aria-describedby={errors.gender ? "gender-error" : undefined}>
          <option value="">Prefer not to specify</option><option value="male">Male</option><option value="female">Female</option>
        </select>
        {errors.gender ? <FieldError id="gender-error">{errors.gender.message}</FieldError> : null}
      </Field>
      <FormInput label="Phone (optional)" type="tel" autoComplete="tel" registration={register("phone", { setValueAs: (value) => value === "" ? undefined : value })} error={errors.phone?.message} />
      <AvatarField control={control} disabled={busy} />
    </fieldset>
    <SubmitButton pending={busy}>Create account</SubmitButton>
    <p className="text-center text-sm text-ink-muted">Already have an account? <Link href="/signin" onClick={clearMessage} className="font-medium text-main underline underline-offset-4">Sign in</Link></p>
  </form>;
}
