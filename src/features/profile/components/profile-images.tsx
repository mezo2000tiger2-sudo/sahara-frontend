"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { saveProfileImage } from "@/features/profile/api";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { profileQueryOptions } from "@/features/profile/queries";
import type { PublicProfile } from "@/schema/profileSchema";
import { updateProfileImageSchema, type UpdateProfileImageInput } from "@/schema/updateProfileImageSchema";

export function ProfileImages({ profile, editable = false }: {
  profile: PublicProfile & { createdAt?: string };
  editable?: boolean;
}) {
  const inputId = useId();
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [brokenCover, setBrokenCover] = useState<string>();
  const [selectionError, setSelectionError] = useState<string>();
  const [refreshError, setRefreshError] = useState<string>();
  const [refreshing, setRefreshing] = useState(false);

  async function refreshProfile() {
    setRefreshing(true);
    setRefreshError(undefined);
    try {
      await queryClient.invalidateQueries({ queryKey: profileQueryOptions.queryKey }, { throwOnError: true });
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshing(false);
    }
  }

  const mutation = useMutation({
    mutationFn: saveProfileImage,
    retry: false,
    onSuccess: refreshProfile,
  });
  const busy = mutation.isPending || refreshing;

  function selectImage(field: UpdateProfileImageInput["field"], event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || busy) return;
    mutation.reset();
    setSelectionError(undefined);
    setRefreshError(undefined);
    const result = updateProfileImageSchema.safeParse({ field, file });
    if (!result.success) {
      setSelectionError(result.error.issues[0].message);
      return;
    }
    mutation.mutate(result.data);
  }

  return (
    <div className="border-b border-outline">
      <div className="relative h-36 bg-linear-to-br from-main-soft via-main to-main-active sm:h-48">
        {profile.coverImage && brokenCover !== profile.coverImage ? (
          // Backend image URLs are rendered directly, without an image optimization proxy.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverImage} alt={`${profile.fullName}'s cover`} className="h-full w-full object-cover"
            onError={() => setBrokenCover(profile.coverImage || undefined)} />
        ) : null}
        {editable ? (
          <Button type="button" variant="outline" disabled={busy} aria-controls={`${inputId}-cover`}
            className="absolute right-3 bottom-3 bg-surface sm:right-5 sm:bottom-5" onClick={() => coverInput.current?.click()}>
            <ImagePlus aria-hidden="true" />{profile.coverImage ? "Change cover" : "Add cover"}
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-8">
        <div className="relative shrink-0">
          <ProfileAvatar profile={profile} />
          {editable ? (
            <Button type="button" size="icon" disabled={busy} aria-label="Change avatar" aria-controls={`${inputId}-avatar`}
              className="absolute -bottom-2 -left-2 size-9 rounded-full border-2 border-surface" onClick={() => avatarInput.current?.click()}>
              <Plus aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className="min-w-0">
          <h2 id="profile-details-title" className="font-heading text-2xl leading-tight font-semibold tracking-tight wrap-anywhere sm:text-3xl">{profile.fullName}</h2>
          {editable && profile.createdAt ? (
            <p className="mt-1 text-sm leading-6 text-ink-subtle">Joined {new Intl.DateTimeFormat("en", {
              month: "long", year: "numeric", timeZone: "UTC",
            }).format(new Date(profile.createdAt))}</p>
          ) : null}
        </div>
      </div>
      {editable ? (
        <div className="px-5 pb-5 sm:px-8">
          <input ref={avatarInput} id={`${inputId}-avatar`} aria-label="Choose avatar image" type="file" accept="image/png,image/jpeg" hidden disabled={busy}
            onChange={(event) => selectImage("avatar", event)} />
          <input ref={coverInput} id={`${inputId}-cover`} aria-label="Choose cover image" type="file" accept="image/png,image/jpeg" hidden disabled={busy}
            onChange={(event) => selectImage("coverImage", event)} />
          <p role="status" className={`text-sm leading-6 text-ink-muted ${busy ? "text-center" : ""}`}>
            {refreshing ? "Refreshing profile…" : mutation.isPending ? "Saving image…" : mutation.isSuccess && !refreshError ? "Image saved." : "Choose a PNG or JPEG. Your image saves immediately."}
          </p>
          {selectionError || mutation.error ? <Alert variant="destructive" className="mt-3 wrap-anywhere">{selectionError || mutation.error?.message}</Alert> : null}
          {refreshError ? (
            <Alert className="mt-3 wrap-anywhere">
              <p>Image saved. Your profile could not be refreshed.</p>
              <p>{refreshError}</p>
              <Button type="button" variant="outline" disabled={busy} className="mt-3" onClick={() => { void refreshProfile(); }}>Retry refresh</Button>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
