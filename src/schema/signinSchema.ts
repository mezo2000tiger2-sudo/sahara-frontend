import { signUpSchema } from "@/schema/signupSchema";

export const signInSchema = signUpSchema.pick({ email: true, password: true });
