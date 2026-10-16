import { z } from "zod";

import { signUpSchema } from "@/schema/signupSchema";

export const updateProfileSchema = signUpSchema
  .pick({ fName: true, lName: true, age: true, gender: true, phone: true })
  .partial()
  .refine((values) => Object.values(values).some((value) => value !== undefined), {
    error: "Change at least one detail.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
