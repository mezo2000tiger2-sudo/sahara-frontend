"use client";

import { useState, type ComponentProps } from "react";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { useAuthMessage } from "@/context/auth-message-context";

export function FormInput({ label, registration, error, type, ...props }: {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
} & ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  const id = `auth-${registration.name}`;
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input {...props} {...registration} id={id} type={password && visible ? "text" : type}
          className={password ? "pr-12" : undefined}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
        {password ? (
          <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0"
            disabled={props.disabled} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            aria-pressed={visible} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        ) : null}
      </div>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

export function FormMessage() {
  const { message } = useAuthMessage();
  if (!message) return null;
  const success = message.type === "success";
  return <Alert role={success ? "status" : "alert"} className={`whitespace-pre-wrap break-words ${success ? "border-success/30 bg-success-soft text-success" : "border-danger/30 bg-danger-soft text-danger"}`}>{message.text}</Alert>;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>
    {pending ? <LoadingSpinner /> : null}
    {children}
  </Button>;
}

export function GoogleButton({ disabled, busy, onBusy, onError }: {
  disabled: boolean;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  async function continueWithGoogle() {
    onBusy(true);
    try {
      await signIn("google", { redirectTo: "/" });
    } catch {
      onError("Unable to start Google sign-in. Please try again.");
      onBusy(false);
    }
  }
  return <Button type="button" variant="outline" size="lg" className="relative w-full gap-3 bg-surface text-ink hover:bg-surface-muted" disabled={disabled}
    onClick={continueWithGoogle}>
    {busy ? <LoadingSpinner /> : (
      <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path className="fill-google-blue" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11c-.47 2.4-1.84 4.44-3.88 5.8v4.82h6.28c3.68-3.39 6.21-8.4 6.21-14.12Z" />
        <path className="fill-google-green" d="M24 44c5.5 0 10.11-1.82 13.48-4.94l-6.28-4.82c-1.82 1.22-4.15 1.94-7.2 1.94-5.32 0-9.83-3.59-11.44-8.42H6.08v4.96A20.36 20.36 0 0 0 24 44Z" />
        <path className="fill-google-yellow" d="M12.56 27.76A12.2 12.2 0 0 1 12 24c0-1.3.2-2.56.56-3.76v-4.96H6.08A20 20 0 0 0 4 24c0 3.23.77 6.29 2.08 8.72l6.48-4.96Z" />
        <path className="fill-google-red" d="M24 11.82c3 0 5.67 1.03 7.8 3.05l5.84-5.84C34.1 5.73 29.5 4 24 4A20.36 20.36 0 0 0 6.08 15.28l6.48 4.96C14.17 15.41 18.68 11.82 24 11.82Z" />
      </svg>
    )}
    Continue with Google
  </Button>;
}

export function GitHubButton({ disabled, busy, onBusy, onError }: {
  disabled: boolean;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  async function continueWithGitHub() {
    onBusy(true);
    try {
      await signIn("github", { redirectTo: "/" });
    } catch {
      onError("Unable to start GitHub sign-in. Please try again.");
      onBusy(false);
    }
  }
  return <Button type="button" variant="outline" size="lg" className="relative w-full gap-3 bg-[#24292f] text-white hover:bg-[#32383f] hover:text-white" disabled={disabled}
    onClick={continueWithGitHub}>
    {busy ? <LoadingSpinner /> : (
      <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 .75a11.25 11.25 0 0 0-3.558 21.922c.563.104.768-.244.768-.542 0-.267-.01-.975-.015-1.913-3.13.68-3.791-1.51-3.791-1.51-.512-1.3-1.25-1.646-1.25-1.646-1.022-.698.077-.684.077-.684 1.13.08 1.725 1.16 1.725 1.16 1.005 1.723 2.637 1.225 3.28.937.102-.728.393-1.225.715-1.507-2.499-.284-5.126-1.25-5.126-5.563 0-1.229.439-2.233 1.16-3.02-.116-.285-.503-1.43.11-2.98 0 0 .945-.302 3.094 1.154A10.79 10.79 0 0 1 12 6.188c.956.004 1.919.129 2.817.379 2.148-1.456 3.091-1.154 3.091-1.154.615 1.55.228 2.695.112 2.98.722.787 1.158 1.791 1.158 3.02 0 4.324-2.631 5.276-5.138 5.555.404.35.766 1.04.766 2.097 0 1.514-.014 2.736-.014 3.108 0 .3.203.65.774.54A11.252 11.252 0 0 0 12 .75Z" />
      </svg>
    )}
    Continue with GitHub
  </Button>;
}

export function AuthDivider() {
  return <div className="flex items-center gap-4 text-sm text-ink-muted" aria-hidden="true">
    <span className="h-px flex-1 bg-outline" />or use your email<span className="h-px flex-1 bg-outline" />
  </div>;
}

