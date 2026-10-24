import { z } from "zod";

export const verifyEmailSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  otp: z.string().regex(/^[0-9]{6}$/, "Enter the 6-digit code from your email."),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
