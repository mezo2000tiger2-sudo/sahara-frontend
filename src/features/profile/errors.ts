import { profileErrorSchema } from "@/schema/profileSchema";

export class ProfileApiError extends Error {
  status: number;
  details?: { path: string; message: string }[];

  constructor(message: string, status: number, details?: { path: string; message: string }[]) {
    super(message);
    this.name = "ProfileApiError";
    this.status = status;
    this.details = details;
  }
}

export function backendProfileError(payload: unknown, status: number, fallback: string) {
  const parsed = profileErrorSchema.safeParse(payload);
  return new ProfileApiError(
    parsed.success ? parsed.data.error ?? parsed.data.message ?? fallback : fallback,
    status,
    parsed.success ? parsed.data.details : undefined,
  );
}
