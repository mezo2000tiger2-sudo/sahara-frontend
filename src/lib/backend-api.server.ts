import "server-only";

import { z } from "zod";

export const backendErrorSchema = z.object({
  error: z.string().optional(),
  details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});

export function backendUrl(path: string) {
  const baseUrl = process.env.BACKEND_API_URL?.replace(/\/+$/, "");
  if (!baseUrl) throw new Error("BACKEND_API_URL is not configured.");
  return `${baseUrl}${path}`;
}
