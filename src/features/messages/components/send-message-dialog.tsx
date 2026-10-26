"use client";

import { useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { sendMessage } from "@/features/messages/api";
import { createMessageSchema, type CreateMessageFormInput, type CreateMessageInput } from "@/schema/createMessageSchema";

export function SendMessageDialog({ recevierId, signedIn }: { recevierId: string; signedIn: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const locked = useRef(false);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateMessageFormInput, unknown, CreateMessageInput>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: { recevierId, content: "", attachments: [], identity: "anonymous" },
  });
  const mutation = useMutation({ mutationFn: sendMessage, retry: false });
  const busy = isSubmitting || mutation.isPending;
  // Zod's whole-form refinement has an empty path, so the resolver uses an empty key.
  const formError = (errors as { ""?: { message?: string } })[""]?.message ?? errors.recevierId?.message;

  async function submit(values: CreateMessageInput) {
    setSuccess("");
    try {
      const result = await mutation.mutateAsync({ ...values, identity: signedIn ? values.identity : "anonymous" });
      reset({ recevierId, content: "", attachments: [], identity: "anonymous" });
      setSuccess(result.message);
    } catch {
      // The mutation displays the error; keep the draft for another attempt.
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!locked.current) setOpen(nextOpen); }}>
      <DialogTrigger asChild><Button type="button" className="w-full">Send message</Button></DialogTrigger>
      <DialogContent onEscapeKeyDown={(event) => { if (locked.current) event.preventDefault(); }}
        onInteractOutside={(event) => { if (locked.current) event.preventDefault(); }}>
        <div className="mb-6 space-y-2">
          <DialogTitle>Send a message</DialogTitle>
          <DialogDescription>Share a message, up to 3 PNG or JPEG images, or both.</DialogDescription>
        </div>
        <form noValidate aria-busy={busy} className="space-y-5"
          onChange={() => setSuccess("")}
          onSubmit={(event) => {
            event.preventDefault();
            if (locked.current) return;
            locked.current = true;
            void handleSubmit(submit)(event).finally(() => { locked.current = false; });
          }}>
          {success ? <Alert role="status" className="border-success/30 bg-success-soft text-success">{success}</Alert> : null}
          {mutation.error ? <Alert variant="destructive" className="wrap-anywhere">{mutation.error.message}</Alert> : null}
          {formError ? <FieldError id={`${id}-form-error`}>{formError}</FieldError> : null}
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Your message</legend>
            <Field data-invalid={Boolean(errors.content || formError)}>
              <FieldLabel htmlFor={`${id}-content`}>Message</FieldLabel>
              <textarea {...register("content")} id={`${id}-content`} rows={4}
                aria-invalid={Boolean(errors.content || formError)}
                aria-describedby={errors.content ? `${id}-content-error` : formError ? `${id}-form-error` : undefined}
                className="min-h-28 w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-3 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-disabled" />
              {errors.content ? <FieldError id={`${id}-content-error`}>{errors.content.message}</FieldError> : null}
            </Field>
            <Controller control={control} name="attachments" render={({ field }) => {
              const files = field.value ?? [];
              const attachmentError = errors.attachments?.message ?? errors.attachments?.root?.message ??
                Object.values(errors.attachments ?? {}).flatMap((error) =>
                  error && typeof error === "object" && "message" in error && typeof error.message === "string" ? [error.message] : [],
                )[0];
              return <Field data-invalid={Boolean(attachmentError)}>
                <FieldLabel htmlFor={`${id}-attachments`}>Images</FieldLabel>
                <Input id={`${id}-attachments`} name={field.name} ref={field.ref} onBlur={field.onBlur}
                  type="file" accept="image/png,image/jpeg" multiple
                  aria-invalid={Boolean(attachmentError)}
                  aria-describedby={`${id}-images-help${attachmentError ? ` ${id}-images-error` : ""}${formError ? ` ${id}-form-error` : ""}`}
                  onChange={(event) => {
                    if (!locked.current) field.onChange([...files, ...Array.from(event.target.files ?? [])]);
                    event.target.value = "";
                  }} />
                <p id={`${id}-images-help`} className="text-sm text-ink-muted">PNG or JPEG. Up to 3 images.</p>
                {files.length ? <ul className="space-y-2">
                  {files.map((file, index) => <li key={index} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 wrap-anywhere">{file.name}</span>
                    <Button type="button" variant="ghost" aria-label={`Remove ${file.name}`} onClick={() => {
                      if (!locked.current) field.onChange(files.filter((_, fileIndex) => fileIndex !== index));
                    }}>Remove</Button>
                  </li>)}
                </ul> : null}
                {attachmentError ? <FieldError id={`${id}-images-error`}>{attachmentError}</FieldError> : null}
              </Field>;
            }} />
            {signedIn ? <Controller control={control} name="identity" render={({ field }) => (
              <Field>
                <span id={`${id}-identity-label`} className="text-sm font-medium">Send as</span>
                <RadioGroup name={field.name} value={field.value} disabled={busy} aria-labelledby={`${id}-identity-label`}
                  onValueChange={(value) => { if (!locked.current) field.onChange(value); }}>
                  <label className="flex min-h-11 items-center gap-3" htmlFor={`${id}-anonymous`}>
                    <RadioGroupItem id={`${id}-anonymous`} value="anonymous" ref={field.ref} onBlur={field.onBlur} />Anonymous
                  </label>
                  <label className="flex min-h-11 items-center gap-3" htmlFor={`${id}-identified`}>
                    <RadioGroupItem id={`${id}-identified`} value="identified" />Show my identity
                  </label>
                </RadioGroup>
              </Field>
            )} /> : <p className="text-sm text-ink-muted">Your message will be sent anonymously.</p>}
          </fieldset>
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button type="submit" disabled={busy} className="sm:flex-1">{busy ? <LoadingSpinner /> : null}{busy ? "Sending…" : "Send message"}</Button>
            <DialogClose asChild><Button type="button" variant="outline" disabled={busy}>Close</Button></DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
