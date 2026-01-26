import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, "auth.emailRequired")
    .email("auth.emailInvalid"),
  password: z
    .string()
    .min(1, "auth.passwordRequired"),
});

export type SignInFormData = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, "auth.nameRequired"),
  email: z
    .string()
    .min(1, "auth.emailRequired")
    .email("auth.emailInvalid"),
  password: z
    .string()
    .min(1, "auth.passwordRequired")
    .min(8, "auth.passwordTooShort"),
  username: z
    .string()
    .optional()
    .refine(
      (val) => !val || (val.length >= 3 && val.length <= 20),
      "auth.usernameTooShort"
    )
    .refine(
      (val) => !val || /^[a-zA-Z0-9_]+$/.test(val),
      "auth.usernameInvalid"
    ),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
