import { z } from "zod";

// Phone number validation (international format)
const phoneRegex = /^\+[1-9]\d{6,14}$/;

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

export const phoneSignInSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, "auth.phoneRequired")
    .regex(phoneRegex, "auth.phoneInvalid"),
  password: z
    .string()
    .min(1, "auth.passwordRequired"),
});

export type PhoneSignInFormData = z.infer<typeof phoneSignInSchema>;

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

export const phoneSignUpSchema = z.object({
  name: z
    .string()
    .min(1, "auth.nameRequired"),
  phoneNumber: z
    .string()
    .min(1, "auth.phoneRequired")
    .regex(phoneRegex, "auth.phoneInvalid"),
  password: z
    .string()
    .min(1, "auth.passwordRequired")
    .min(8, "auth.passwordTooShort"),
});

export type PhoneSignUpFormData = z.infer<typeof phoneSignUpSchema>;
