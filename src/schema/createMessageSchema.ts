import { z } from "zod";

const attachmentSchema = z.instanceof(File).refine(
  (file) => ["image/png", "image/jpeg", "image/jpg"].includes(file.type),
  "Choose a PNG or JPEG image.",
);

export const createMessageSchema = z.object({
  recevierId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid recipient."),
  content: z.string().trim().transform((content) => content || undefined).optional(),
  attachments: z.array(attachmentSchema).max(3, "Choose up to 3 images.").default([]),
  identity: z.enum(["anonymous", "identified"]).default("anonymous"),
}).refine((message) => message.content || message.attachments.length > 0, {
  error: "Add a message or choose an image.",
});

export const backendCreateMessageResponseSchema = z.object({
  message: z.object({
    _id: z.string().regex(/^[a-f\d]{24}$/i),
  }),
});

export const createMessageResponseSchema = z.object({ message: z.string() });

export type CreateMessageInput = z.output<typeof createMessageSchema>;
// Defaults and transforms make the resolver input distinct from its output.
export type CreateMessageFormInput = z.input<typeof createMessageSchema>;
