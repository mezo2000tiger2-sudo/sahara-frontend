import { z } from "zod";

import { signUpSchema } from "@/schema/signupSchema";

export const updatePasswordSchema = z.strictObject({
  oldpassword: signUpSchema.shape.password,
  newpassword: signUpSchema.shape.password,
});

export const updatePasswordFormSchema = updatePasswordSchema
  .extend({ cPassword: z.string().min(1, "Confirm your password.") })
  .refine((values) => values.newpassword === values.cPassword, {
    error: "Passwords do not match.",
    path: ["cPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdatePasswordFormInput = z.infer<typeof updatePasswordFormSchema>;
