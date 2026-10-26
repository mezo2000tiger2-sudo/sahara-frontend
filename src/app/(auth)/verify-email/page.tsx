"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Button } from "@/components/ui/button";
import { useAuthMessage } from "@/context/auth-message-context";
import { FormInput, FormMessage, SubmitButton } from "@/features/auth/components/form-controls";
import { verifyEmailSchema, type VerifyEmailInput } from "@/schema/verifyEmailSchema";

const verificationResponseSchema = z.object({
  message: z.string(),
  fieldErrors: z.object({ email: z.array(z.string()).optional(), otp: z.array(z.string()).optional() }).optional(),
});

const resendResponseSchema = verificationResponseSchema.extend({
  retryAfterSeconds: z.number().int().positive().max(Math.floor(Number.MAX_SAFE_INTEGER / 1000)).optional(),
});

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setMessage, clearMessage } = useAuthMessage();
  const [redirecting, setRedirecting] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState({ email: "", seconds: 0, ready: false });
  const deadlines = useRef(new Map<string, number>());
  const requestPending = useRef(false);
  const { register, control, handleSubmit, getValues, trigger, setValue, clearErrors, setError, formState: { errors, isSubmitting } } = useForm<VerifyEmailInput>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: searchParams.get("email") ?? "", otp: "" },
  });
  const email = useWatch({ control, name: "email" });
  const busy = isSubmitting || resending || redirecting;
  const timerReady = timer.ready && timer.email === email;
  const remaining = timerReady ? timer.seconds : 0;
  const countdown = `${Math.floor(remaining / 60).toString().padStart(2, "0")}:${(remaining % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    const key = `auth:resend-otp:${email}`;
    try {
      const saved = Number(sessionStorage.getItem(key));
      if (Number.isSafeInteger(saved) && saved > Date.now()) deadlines.current.set(email, saved);
      else sessionStorage.removeItem(key);
    } catch {
      // Keep the current page's deadlines when browser storage is unavailable.
    }
    function tick() {
      const deadline = deadlines.current.get(email) ?? 0;
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (deadline && seconds === 0) {
        deadlines.current.delete(email);
        try { sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
      }
      setTimer((current) => current.ready && current.email === email && current.seconds === seconds
        ? current : { email, seconds, ready: true });
    }
    const initialTick = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => { clearTimeout(initialTick); clearInterval(interval); };
  }, [email]);

  function startCountdown(address: string, seconds: number) {
    const deadline = Date.now() + seconds * 1000;
    deadlines.current.set(address, deadline);
    setTimer({ email: address, seconds, ready: true });
    try {
      sessionStorage.setItem(`auth:resend-otp:${address}`, String(deadline));
    } catch {
      // The in-memory deadline still works without storage.
    }
  }

  async function resend() {
    if (requestPending.current || busy || !timerReady || remaining > 0) return;
    requestPending.current = true;
    setResending(true);
    clearMessage();
    try {
      if (!await trigger("email", { shouldFocus: true })) return;
      const address = getValues("email");
      const response = await fetch("/api/auth/resend-otp", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const result = resendResponseSchema.safeParse(await response.json().catch(() => null));
      if (response.status === 200 && result.success && result.data.message === "Done" && !result.data.fieldErrors) {
        setValue("otp", "");
        clearErrors("otp");
        startCountdown(address, 120);
        setMessage({ text: "A new verification code has been sent.", type: "success" });
      } else if (!response.ok && result.success) {
        const error = result.data.fieldErrors?.email?.[0];
        if (error) setError("email", { type: "server", message: error }, { shouldFocus: true });
        if (result.data.retryAfterSeconds) startCountdown(address, result.data.retryAfterSeconds);
        setMessage({ text: result.data.message, type: "error" });
      } else {
        setMessage({ text: "We could not confirm that a new code was sent. Please try again.", type: "error" });
      }
    } catch {
      setMessage({ text: "Resending your code is unavailable right now. Please try again.", type: "error" });
    } finally {
      requestPending.current = false;
      setResending(false);
    }
  }

  async function submit(values: VerifyEmailInput) {
    if (requestPending.current || redirecting) return;
    requestPending.current = true;
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
        deadlines.current.delete(values.email);
        try { sessionStorage.removeItem(`auth:resend-otp:${values.email}`); } catch { /* Storage is optional. */ }
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
    } finally {
      requestPending.current = false;
    }
  }

  return <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)} className="space-y-6" aria-busy={busy}>
    <FormMessage />
    <fieldset disabled={busy} className="space-y-6">
      <legend className="sr-only">Verify your email address</legend>
      <FormInput label="Email" type="email" autoComplete="email" registration={register("email")} error={errors.email?.message} />
      <FormInput label="Verification code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} registration={register("otp")} error={errors.otp?.message} />
    </fieldset>
    <SubmitButton pending={busy}>Verify email</SubmitButton>
    <div className="space-y-2 text-center">
      <p className="text-sm text-ink-muted">Didn&apos;t receive your code, or has it expired?</p>
      <Button type="button" variant="outline" className="w-full" disabled={busy || !timerReady || remaining > 0} onClick={resend}>
        {resending ? "Sending…" : remaining > 0 ? `Resend code in ${countdown}` : "Resend code"}
      </Button>
    </div>
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
