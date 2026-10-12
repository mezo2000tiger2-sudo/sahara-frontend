import { z } from "zod";

export const signUpSchema = z.strictObject({
  fName: z
    .string({ error: "First name is required." })
    .min(2, "First name must contain at least 2 characters.")
    .max(50, "First name must contain at most 50 characters.")
    .regex(/^[a-zA-Z0-9]+$/, "First name must contain only letters and numbers."),
  lName: z
    .string({ error: "Last name is required." })
    .min(2, "Last name must contain at least 2 characters.")
    .max(50, "Last name must contain at most 50 characters."),
  email: z
    .string({ error: "Email is required." })
    .min(2, "Email must contain at least 2 characters.")
    .max(50, "Email must contain at most 50 characters.")
    .pipe(z.email({ error: "Enter a valid email address." })),
  password: z
    .string({ error: "Password is required." })
    .min(1, "Password is required."),
  age: z
    .number({ error: "Age must be a number." })
    .min(18, "Age must be at least 18.")
    .max(120, "Age must be at most 120."),
  gender: z.enum(["male", "female"]).optional(),
  phone: z.string().min(1, "Phone must not be empty when provided.").optional(),
  avatar: z
    .file()
    .refine((file) => file.type.startsWith("image/"), "Choose an image for your avatar.")
    .optional(),
});

/** Password confirmation belongs to the form, not the backend API request. */
export const signUpFormSchema = signUpSchema
  .extend({ cPassword: z.string().min(1, "Confirm your password.") })
  .refine((values) => values.password === values.cPassword, {
    error: "Passwords do not match.",
    path: ["cPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignUpFormInput = z.infer<typeof signUpFormSchema>;
