import { z } from "zod";

export const attachmentUrlSchema = z.url({ protocol: /^https$/ }).refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return value.startsWith("https://") && !url.username && !url.password;
});

export const attachmentsSchema = z.array(attachmentUrlSchema.nullable());

// Keep unavailable slots so legacy paths never leave the server or lose their count.
export const backendAttachmentsSchema = z.array(z.union([
  z.string(),
  z.object({ url: z.string() }),
])).default([]).transform((attachments) => attachments.map((attachment) => {
  const result = attachmentUrlSchema.safeParse(typeof attachment === "string" ? attachment : attachment.url);
  return result.success ? result.data : null;
}));
