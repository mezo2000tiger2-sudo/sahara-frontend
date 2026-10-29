"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { useAuthMessage } from "@/context/auth-message-context";
import { signInSchema } from "@/schema/signinSchema";
import { authenticationErrorMessage } from "@/features/auth/errors";
import { AuthDivider, FormInput, FormMessage, GoogleButton, GitHubButton, SubmitButton } from "./form-controls";

export function SigninForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const { setMessage, clearMessage } = useAuthMessage();
  useEffect(() => {
    if (initialError) setMessage({ text: initialError, type: "error" });
  }, [initialError, setMessage]);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [githubBusy, setGithubBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" },
  });
  const busy = isSubmitting || googleBusy || githubBusy || redirecting;

  async function submit(values: z.infer<typeof signInSchema>) {
    clearMessage();
    try {
      const result = await signIn("credentials", { ...values, redirect: false, redirectTo: "/" });
      if (!result || result.error || !result.ok || !result.url) {
        setMessage({ text: authenticationErrorMessage(result?.error ?? "Unknown", result?.code)!, type: "error" });
        return;
      }
      setRedirecting(true);
      router.replace("/");
      router.refresh();
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
      <legend className="sr-only">Sign in with email</legend>
      <FormInput label="Email" type="email" autoComplete="email" registration={register("email")} error={errors.email?.message} />
      <FormInput label="Password" type="password" autoComplete="current-password" disabled={busy} registration={register("password")} error={errors.password?.message} />
    </fieldset>
    <SubmitButton pending={busy}>Sign in</SubmitButton>
    <p className="text-center text-sm text-ink-muted">New to Saharah? <Link href="/signup" onClick={clearMessage} className="font-medium text-main underline underline-offset-4">Create account</Link></p>
  </form>;
}
