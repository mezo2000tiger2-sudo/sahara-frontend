import { z } from "zod";

const profileFields = z.object({
  fName: z.string().optional(),
  lName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string(),
  phone: z.string().nullish(),
  age: z.number().min(18).max(70).nullish(),
  gender: z.enum(["male", "female"]).nullish(),
  avatar: z.string().nullish(),
});

export const publicProfileSchema = profileFields.transform(({ fName, lName, fullName, ...profile }) => ({
  ...profile,
  fullName: fullName?.trim() || [fName, lName].filter(Boolean).join(" ").trim(),
}));

export const profileSchema = profileFields.extend({
  _id: z.string().regex(/^[a-f\d]{24}$/i),
  fName: z.string(),
  lName: z.string(),
  providor: z.enum(["system", "google", "github"]),
  createdAt: z.iso.datetime().optional(),
}).transform((profile) => ({
  ...profile,
  fullName: profile.fullName?.trim() || `${profile.fName} ${profile.lName}`.trim(),
}));

export const profileMessageSchema = z.object({ message: z.string() });
export const passwordResultSchema = profileMessageSchema.extend({ logoutError: z.string().optional() });
export const profileResponseSchema = profileMessageSchema.extend({ user: profileSchema });
export const publicProfileResponseSchema = profileMessageSchema.extend({ user: publicProfileSchema });

export const profileErrorSchema = z.object({
  error: z.string().optional(),
  message: z.string().optional(),
  details: z.array(z.object({ path: z.string().default(""), message: z.string() })).optional().catch(undefined),
});

export type Profile = z.infer<typeof profileSchema>;
export type PublicProfile = z.infer<typeof publicProfileSchema>;
