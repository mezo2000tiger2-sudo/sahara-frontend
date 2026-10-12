"use client";

import { useEffect, useRef, useState } from "react";
import { useController, type Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import type { SignUpFormInput } from "@/schema/signupSchema";

export function AvatarField({ control, disabled }: { control: Control<SignUpFormInput>; disabled: boolean }) {
  const { field, fieldState } = useController({ name: "avatar", control });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  return <Field data-invalid={Boolean(fieldState.error)}>
    <FieldLabel htmlFor="auth-avatar">Avatar image <span className="font-normal text-ink-muted">(optional)</span></FieldLabel>
    <Input id="auth-avatar" name={field.name} type="file" accept="image/*" disabled={disabled}
      ref={(input) => { field.ref(input); inputRef.current = input; }} onBlur={field.onBlur}
      aria-invalid={Boolean(fieldState.error)} aria-describedby={`avatar-help${fieldState.error ? " avatar-error" : ""}`}
      onChange={(event) => {
        const file = event.target.files?.[0];
        field.onChange(file);
        setPreview(file?.type.startsWith("image/") ? URL.createObjectURL(file) : undefined);
      }} />
    <FieldDescription id="avatar-help">Add a personal image, or leave this empty.</FieldDescription>
    {field.value ? <div className="flex items-center gap-4">
      {/* Local object URLs do not benefit from Next.js image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="Selected avatar preview" className="size-16 shrink-0 rounded-full border border-outline object-cover" /> : null}
      <p className="min-w-0 flex-1 break-all text-sm text-ink-muted">{field.value.name}</p>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => {
        field.onChange(undefined);
        setPreview(undefined);
        if (inputRef.current) inputRef.current.value = "";
      }}>Remove</Button>
    </div> : null}
    {fieldState.error ? <FieldError id="avatar-error">{fieldState.error.message}</FieldError> : null}
  </Field>;
}
