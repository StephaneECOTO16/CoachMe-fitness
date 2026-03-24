/**
 * Single source of truth for all Zod validation schemas.
 * Import from here in both API route handlers and client-side forms.
 *
 * Naming convention:
 *  - *Schema   → Zod schema object
 *  - *Input    → TypeScript type inferred from the schema
 */

import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const e164PhoneStr = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format, e.g. +237659037423");

/** Optional E.164 phone number: valid or empty/missing */
const e164PhoneOptional = e164PhoneStr.optional().or(z.literal(""));

/** Required E.164 phone number */
const e164PhoneRequired = e164PhoneStr.min(1, "Phone number is required");

/** URL that is either valid or empty string (optional URL fields) */
const optionalUrl = z
  .string()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional();

/** Strong password rules */
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number");

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof LoginRequestSchema>;

export const RegisterRequestSchema = z.discriminatedUnion("accountType", [
  z.object({
    accountType: z.literal("PROSPECT"),
    email: z.string().email(),
    password: strongPassword,
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: e164PhoneOptional,
    ageRange: z.string().optional(),
    heightCm: z.coerce.number().positive().optional(),
    weightKg: z.coerce.number().positive().optional(),
    goals: z.string().optional(),
  }),
  z.object({
    accountType: z.literal("COACH"),
    email: z.string().email(),
    password: strongPassword,
    name: z.string().min(2),
    phone: e164PhoneRequired,
    discipline: z.string().min(2, "Discipline is required"),
    bio: z.string().optional(),
    portfolio: optionalUrl,
  }),
]);
export type RegisterInput = z.infer<typeof RegisterRequestSchema>;

// Client-side registration form (includes confirmPassword + terms)
export const registerFormSchema = z
  .object({
    accountType: z.enum(["PROSPECT", "COACH"]),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: e164PhoneOptional,
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    termsAccepted: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms and conditions" }),
    }),
    // PROSPECT fields
    ageRange: z.string().optional(),
    heightCm: z.string().optional(),
    weightKg: z.string().optional(),
    goals: z.string().optional(),
    // COACH fields
    discipline: z.string().optional(),
    bio: z.string().optional(),
    portfolio: optionalUrl,
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.accountType !== "COACH" || Boolean(d.discipline?.trim()), {
    message: "Discipline is required for coach accounts",
    path: ["discipline"],
  })
  .refine((d) => d.accountType !== "COACH" || Boolean(d.phone?.trim()), {
    message: "Phone number is required for coach accounts",
    path: ["phone"],
  });
export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UpdateBasicInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: e164PhoneOptional.nullable(),
});
export type UpdateBasicInfoInput = z.infer<typeof UpdateBasicInfoSchema>;

export const UpdateCoachProfileSchema = z.object({
  discipline: z.string().min(2, "Discipline is required"),
  bio: z.string().max(2000).optional().nullable(),
  portfolio: optionalUrl.nullable(),
  rateType: z.enum(["HOUR", "WEEK", "MONTH"]).optional().nullable(),
  rateAmount: z.number().positive().optional().nullable().or(z.nan()),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  experienceYears: z.number().int().min(0).optional().nullable().or(z.nan()),
  instagram: optionalUrl.nullable(),
  facebook: optionalUrl.nullable(),
  tiktok: optionalUrl.nullable(),
  twitter: optionalUrl.nullable(),
  youtube: optionalUrl.nullable(),
});
export type UpdateCoachProfileInput = z.infer<typeof UpdateCoachProfileSchema>;

export const UpdateClientProfileSchema = z.object({
  ageRange: z.string().optional().nullable(),
  heightCm: z.number().positive().optional().nullable().or(z.nan()),
  weightKg: z.number().positive().optional().nullable().or(z.nan()),
  goals: z.string().optional().nullable(),
});
export type UpdateClientProfileInput = z.infer<typeof UpdateClientProfileSchema>;

export const UpdateAvatarSchema = z.object({
  avatar: z.string().nullable(),
});
export type UpdateAvatarInput = z.infer<typeof UpdateAvatarSchema>;

// ─── Password & credentials ───────────────────────────────────────────────────

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPassword,
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordRequestSchema>;

export const changePasswordFormSchema = ChangePasswordRequestSchema.extend({
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
export type ChangePasswordFormInput = z.infer<typeof changePasswordFormSchema>;

export const UpdateCredentialsRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});
export type UpdateCredentialsInput = z.infer<typeof UpdateCredentialsRequestSchema>;

export const DeleteAccountRequestSchema = z.object({
  password: z.string().min(1, "Password is required to confirm deletion"),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountRequestSchema>;

// ─── Media / uploads ─────────────────────────────────────────────────────────

export const PresignedUrlRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive().max(52_428_800, "File cannot exceed 50 MB"),
});
export type PresignedUrlInput = z.infer<typeof PresignedUrlRequestSchema>;

export const RegisterMediaSchema = z.object({
  s3Key: z.string().min(1, "s3Key is required"),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
  description: z.string().optional(),
  type: z.enum(["CERTIFICATE", "IMAGE", "VIDEO", "OTHER"]),
});
export type RegisterMediaInput = z.infer<typeof RegisterMediaSchema>;

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const InitiateChatSchema = z.object({
  coachId: z.number().int().positive("Valid coach ID required"),
});
export type InitiateChatInput = z.infer<typeof InitiateChatSchema>;

export const SendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(5000, "Message cannot exceed 5000 characters"),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

// ─── Admin ────────────────────────────────────────────────────────────────────

export const RejectCoachBodySchema = z.object({
  reason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});
export type RejectCoachInput = z.infer<typeof RejectCoachBodySchema>;

export const CreateDisciplineSchema = z.object({
  name: z.string().min(2, "Discipline name must be at least 2 characters"),
  imageKey: z.string().min(1, "Cover image is required"),
});
export type CreateDisciplineInput = z.infer<typeof CreateDisciplineSchema>;

export const UpdateDisciplineSchema = z.object({
  name: z.string().min(2).optional(),
  imageKey: z.string().optional(),
});
export type UpdateDisciplineInput = z.infer<typeof UpdateDisciplineSchema>;

// ─── Password reset ───────────────────────────────────────────────────────────

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── Shared request body parser ───────────────────────────────────────────────

/**
 * Parses and validates an incoming request body against a Zod schema.
 * Returns { data } on success or { error } on validation failure.
 * This is the standard validation entry point for all route handlers.
 */
export async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data?: T; error?: { code: string; message: string } }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const first = result.error.errors[0];
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: first?.message ?? "Invalid input",
        },
      };
    }

    return { data: result.data };
  } catch {
    return {
      error: { code: "INVALID_JSON", message: "Request body must be valid JSON" },
    };
  }
}
