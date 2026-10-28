"use client";

import { useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";

import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { sendMessage } from "@/features/messages/api";
import { ProfileApiError } from "@/features/profile/errors";
import { createMessageSchema, type CreateMessageFormInput, type CreateMessageInput } from "@/schema/createMessageSchema";

export function SendMessageDialog({ recevierId, signedIn }: { recevierId: string; signedIn: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState("");
  const locked = useRef(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateMessageFormInput, unknown, CreateMessageInput>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: { recevierId, content: "", attachments: [], identity: "anonymous" },
  });
  const mutation = useMutation({ mutationFn: sendMessage, retry: false });
  const busy = isSubmitting || mutation.isPending;
  // Zod's whole-form refinement has an empty path, so the resolver uses an empty key.
  const formError = (errors as { ""?: { message?: string } })[""]?.message;
  const attachmentErrors = [
    errors.attachments?.message,
    errors.attachments?.root?.message,
    ...Object.entries(errors.attachments ?? {}).flatMap(([key, error]) =>
      /^\d+$/.test(key) && error && typeof error === "object" && "message" in error && typeof error.message === "string" ? [error.message] : [],
    ),
  ].filter((message): message is string => typeof message === "string");
  const errorMessages = [...new Set([
    formError, errors.root?.message, errors.content?.message, errors.recevierId?.message, errors.identity?.message,
    ...attachmentErrors,
    mutation.error?.message,
    ...(mutation.error instanceof ProfileApiError ? mutation.error.details?.map((detail) => detail.message) ?? [] : []),
  ].filter((message): message is string => typeof message === "string"))];
  const errorId = `${id}-errors`;
  const contentInvalid = Boolean(errors.content || formError);
  const imagesInvalid = Boolean(errors.attachments || formError);

  async function submit(values: CreateMessageInput) {
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
            setSuccess("");
            event.preventDefault();
            if (locked.current) return;
            locked.current = true;
            mutation.reset();
            void handleSubmit(submit)(event).finally(() => { locked.current = false; });
          }}>
          {success ? <Alert role="status" className="border-success/30 bg-success-soft! text-success!">{success}</Alert> : null}
          {errorMessages.length ? <Alert id={errorId} variant="destructive" className="border-danger/40 bg-danger-soft! p-4! text-danger! wrap-anywhere">
            <ul className="list-disc space-y-1 pl-5">
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </Alert> : null}
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <legend className="sr-only">Your message</legend>
            <Field data-invalid={contentInvalid}>
              <FieldLabel htmlFor={`${id}-content`}>Message</FieldLabel>
              <textarea {...register("content")} id={`${id}-content`} rows={4}
                aria-invalid={contentInvalid}
                aria-describedby={contentInvalid ? errorId : undefined}
                className="min-h-28 w-full resize-y rounded-lg border border-input bg-surface px-3 py-2 text-base text-ink outline-none placeholder:text-ink-muted focus-visible:ring-3 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-disabled" />
            </Field>
            <Controller control={control} name="attachments" render={({ field }) => {
              const files = field.value ?? [];
              return <Field data-invalid={imagesInvalid}>
                <FieldLabel htmlFor={`${id}-attachments`}>Images</FieldLabel>
                <Button type="button" variant="outline" className="w-fit" aria-controls={`${id}-attachments`}
                  aria-invalid={imagesInvalid} aria-describedby={`${id}-images-help${imagesInvalid ? ` ${errorId}` : ""}`}
                  onClick={() => { if (!locked.current) fileInput.current?.click(); }}>Add images</Button>
                <Input id={`${id}-attachments`} name={field.name} ref={(element) => { field.ref(element); fileInput.current = element; }} onBlur={field.onBlur}
                  type="file" accept="image/png,image/jpeg" multiple className="sr-only"
                  aria-invalid={imagesInvalid}
                  aria-describedby={`${id}-images-help${imagesInvalid ? ` ${errorId}` : ""}`}
                  onChange={(event) => {
                    if (!locked.current) field.onChange([...files, ...Array.from(event.target.files ?? [])]);
                    event.target.value = "";
                  }} />
                <p id={`${id}-images-help`} className="text-sm text-ink-muted">PNG or JPEG. Up to 3 images.</p>
                {files.length ? <ul className="space-y-2">
                  {files.map((file, index) => <li key={index} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 wrap-anywhere">{file.name}</span>
                    <Button type="button" variant="destructive" className="bg-danger! text-danger-foreground! hover:bg-danger/85! focus-visible:ring-danger/40" aria-label={`Remove ${file.name}`} onClick={() => {
                      if (!locked.current) field.onChange(files.filter((_, fileIndex) => fileIndex !== index));
                    }}>Remove</Button>
                  </li>)}
                </ul> : null}
              </Field>;
            }} />
            {signedIn ? <Controller control={control} name="identity" render={({ field }) => (
              <Field data-invalid={Boolean(errors.identity)}>
                <span id={`${id}-identity-label`} className="text-sm font-medium">Send as</span>
                <RadioGroup name={field.name} value={field.value} disabled={busy} aria-labelledby={`${id}-identity-label`}
                  className="grid-cols-2" orientation="horizontal"
                  aria-invalid={Boolean(errors.identity)} aria-describedby={errors.identity ? errorId : undefined}
                  onValueChange={(value) => { if (!locked.current) field.onChange(value); }}>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-outline p-3 has-[[data-state=checked]]:border-main has-[[data-state=checked]]:bg-main-soft" htmlFor={`${id}-anonymous`}>
                    <RadioGroupItem id={`${id}-anonymous`} value="anonymous" ref={field.ref} onBlur={field.onBlur} />Anonymous
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-outline p-3 has-[[data-state=checked]]:border-main has-[[data-state=checked]]:bg-main-soft" htmlFor={`${id}-identified`}>
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
