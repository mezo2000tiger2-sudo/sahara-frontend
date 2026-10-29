import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid message or request ID.");
export const directionSchema = z.enum(["received", "sent"]);
export type Direction = z.infer<typeof directionSchema>;

export const messageListInputSchema = z.object({
  direction: directionSchema.default("received"),
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  size: z.coerce.number().int().min(1).max(50).default(5),
}).strict().refine(({ page, size }) => Number.isSafeInteger((page - 1) * size), {
  message: "Pagination exceeds the safe range.",
});

export const paginationFields = {
  page: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  pages: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  size: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
};

export const messageSchema = z.object({
  _id: objectIdSchema,
  recevierId: objectIdSchema,
  content: z.string().optional(),
  attachmentCount: z.number().int().min(0),
  conversationId: objectIdSchema.nullable().default(null),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// Only attachment counts leave the server; stored paths are not public URLs.
export const backendMessageSchema = messageSchema.omit({ attachmentCount: true }).extend({
  attachments: z.array(z.string()).default([]),
}).transform(({ attachments, ...message }) => ({ ...message, attachmentCount: attachments.length }));

export const messagesResponseSchema = z.object({
  message: z.string(),
  data: z.object({ messages: z.array(messageSchema), ...paginationFields }),
});
export const backendMessagesResponseSchema = messagesResponseSchema.omit({ data: true }).extend({
  data: z.object({ messages: z.array(backendMessageSchema), ...paginationFields }),
});
export const messageResponseSchema = z.object({ message: messageSchema });
export const backendMessageResponseSchema = z.object({ message: backendMessageSchema });

export type Message = z.infer<typeof messageSchema>;
export type MessageListInput = z.infer<typeof messageListInputSchema>;
