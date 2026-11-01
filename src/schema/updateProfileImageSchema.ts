import { z } from "zod";

export const updateProfileImageSchema = z.strictObject({
  field: z.enum(["avatar", "coverImage"]),
  file: z.file()
    .min(1, "Choose a nonempty image.")
    .mime(["image/png", "image/jpeg"], "Choose a PNG or JPEG image."),
});

export type UpdateProfileImageInput = z.infer<typeof updateProfileImageSchema>;
