"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { LoadingSpinner } from "@/components/loading-spinner";
import { useAuthMessage } from "@/context/auth-message-context";
import { FormInput, FormMessage, SubmitButton } from "@/features/auth/components/form-controls";
import { verifyEmailSchema, type VerifyEmailInput } from "@/schema/verifyEmailSchema";

const verificationResponseSchema = z.object({
  message: z.string(),
  fieldErrors: z.object({ email: z.array(z.string()).optional(), otp: z.array(z.string()).optional() }).optional(),
});

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMessage, clearMessage } = useAuthMessage();
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: searchParams.get("email") ?? "", otp: "" },
  });
  const busy = isSubmitting || redirecting;

  async function submit(values: VerifyEmailInput) {
    clearMessage();
    try {
      const response = await fetch("/api/auth/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = verificationResponseSchema.safeParse(await response.json().catch(() => null));
      if (response.status === 200 && result.success && result.data.message === "done" && !result.data.fieldErrors) {
        setRedirecting(true);
        setMessage({ text: "Email confirmed. You can now sign in.", type: "success" });
        router.replace("/signin");
        return;
      }
      if (!response.ok && result.success) {
        for (const field of ["email", "otp"] as const) {
          const error = result.data.fieldErrors?.[field]?.[0];
          if (error) setError(field, { type: "server", message: error }, { shouldFocus: true });
        }
        setMessage({ text: result.data.message, type: "error" });
      } else {
        setMessage({ text: "We could not confirm email verification. Please try signing in before submitting again.", type: "error" });
      }
    } catch {
      setMessage({ text: "Email verification is unavailable right now. Please try again.", type: "error" });
    }
  }

  return <form noValidate onSubmit={handleSubmit(submit)} className="space-y-6" aria-busy={busy}>
    <FormMessage />
    <fieldset disabled={busy} className="space-y-6">
      <legend className="sr-only">Verify your email address</legend>
      <FormInput label="Email" type="email" autoComplete="email" registration={register("email")} error={errors.email?.message} />
      <FormInput label="Verification code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} registration={register("otp")} error={errors.otp?.message} />
    </fieldset>
    <SubmitButton pending={busy}>Verify email</SubmitButton>
    <p className="text-center text-sm text-ink-muted"><Link href="/signin" onClick={clearMessage} className="font-medium text-main underline underline-offset-4">Back to sign in</Link></p>
  </form>;
}

export default function VerifyEmailPage() {
  return <>
    <h1 className="mb-4 text-center font-heading text-3xl font-semibold">Verify your email</h1>
    <p className="mb-8 text-center text-ink-muted">Enter the 6-digit code sent to your email to confirm your account.</p>
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailForm />
    </Suspense>
  </>;
}
