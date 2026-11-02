import { z } from "zod";
import { imageFileSchema } from "@/schema/createMessageSchema";
import { attachmentsSchema, backendAttachmentsSchema } from "@/schema/attachmentSchema";
import { objectIdSchema, paginationFields } from "@/schema/messageSchema";

export const conversationListInputSchema = z.object({
  page: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).default(1),
  size: z.coerce.number().int().min(1).max(50).default(5),
}).strict().refine(({ page, size }) => Number.isSafeInteger((page - 1) * size), {
  message: "Pagination exceeds the safe range.",
});

export const sendConversationMessageSchema = z.object({
  content: z.string().trim().max(5000).default(""),
  attachments: z.array(imageFileSchema).max(3, "Choose up to 3 images.").default([]),
}).strict().refine(({ content, attachments }) => content || attachments.length > 0, {
  message: "Add a message or choose an image.",
});

export const conversationSchema = z.object({
  _id: objectIdSchema,
  participants: z.array(z.object({
    _id: objectIdSchema,
    fName: z.string(),
    lName: z.string(),
    avatar: z.string().nullable(),
  })).length(2),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const conversationMessageSchema = z.object({
  _id: objectIdSchema,
  conversationId: objectIdSchema.nullable(),
  senderId: objectIdSchema,
  recevierId: objectIdSchema,
  content: z.string().nullable(),
  attachments: attachmentsSchema,
  attachmentCount: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

// Sanitize attachments before returning them to the browser.
export const backendConversationMessageSchema = conversationMessageSchema.omit({ attachmentCount: true }).extend({
  attachments: backendAttachmentsSchema,
}).transform(({ attachments, ...message }) => ({ ...message, attachments, attachmentCount: attachments.length }));

export const conversationsResponseSchema = z.object({
  message: z.string(),
  conversations: z.array(conversationSchema),
  ...paginationFields,
});

export const conversationMessagesResponseSchema = z.object({
  message: z.string(),
  conversation: conversationSchema,
  messages: z.array(conversationMessageSchema),
  ...paginationFields,
});

export const backendConversationMessagesResponseSchema = conversationMessagesResponseSchema.extend({
  messages: z.array(backendConversationMessageSchema),
});

export const sendConversationMessageResponseSchema = z.object({
  message: z.string(),
  chatMessage: conversationMessageSchema,
});

export const backendSendConversationMessageResponseSchema = sendConversationMessageResponseSchema.extend({
  chatMessage: backendConversationMessageSchema,
});

export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type SendConversationMessageInput = z.infer<typeof sendConversationMessageSchema>;
