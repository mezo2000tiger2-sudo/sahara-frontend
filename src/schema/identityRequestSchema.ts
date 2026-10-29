import { z } from "zod";

import { objectIdSchema, paginationFields } from "@/schema/messageSchema";

export const identityRequestStatusSchema = z.enum(["pending", "accepted", "rejected"]);
export const createIdentityRequestSchema = z.object({ messageId: objectIdSchema }).strict();
export const decideIdentityRequestSchema = z.object({ status: z.enum(["accepted", "rejected"]) }).strict();

export const identityRequestSchema = z.object({
  _id: objectIdSchema,
  messageId: objectIdSchema,
  status: identityRequestStatusSchema,
  requester: z.object({ _id: objectIdSchema, fName: z.string(), lName: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  conversationId: objectIdSchema.nullable().optional(),
});

export const identityRequestsResponseSchema = z.object({
  message: z.string(),
  requests: z.array(identityRequestSchema),
  ...paginationFields,
});
export const identityRequestResultSchema = z.object({
  message: z.string(),
  request: identityRequestSchema,
  conversationId: objectIdSchema.nullable(),
});

export type IdentityRequest = z.infer<typeof identityRequestSchema>;
export type IdentityRequestResult = z.infer<typeof identityRequestResultSchema>;
export type CreateIdentityRequestInput = z.infer<typeof createIdentityRequestSchema>;
export type DecideIdentityRequestInput = z.infer<typeof decideIdentityRequestSchema>;
