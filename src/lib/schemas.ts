/**
 * src/lib/schemas.ts
 * Zod validation schemas for API request/response payloads.
 */

import { z } from 'zod';

// ============ Authentication Schemas ============

export const LoginRequestSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Predefined discipline options
export const DISCIPLINES = [
    'Yoga',
    'Strength Training',
    'CrossFit',
    'Pilates',
    'Boxing',
    'Running',
    'Swimming',
    'Personal Training',
    'Nutrition Coaching',
    'Cycling',
    'Martial Arts',
    'Dance',
    'Calisthenics',
    'Powerlifting',
    'Bodybuilding',
] as const;

export const RegisterRequestSchema = z.discriminatedUnion('accountType', [
    // PROSPECT registration
    z.object({
        accountType: z.literal('PROSPECT'),
        email: z.string().email('Invalid email format'),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/\d/, 'Password must contain at least one digit'),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        // Prospect-specific fields
        ageRange: z.string().optional(),
        heightCm: z.coerce.number().positive('Height must be positive').optional(),
        weightKg: z.coerce.number().positive('Weight must be positive').optional(),
        goals: z.string().optional(),
    }),
    // COACH registration
    z.object({
        accountType: z.literal('COACH'),
        email: z.string().email('Invalid email format'),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
            .regex(/\d/, 'Password must contain at least one digit'),
        name: z.string().min(2, 'Name must be at least 2 characters'),
        // Coach-specific fields
        discipline: z.string().min(2, 'Discipline is required'),
        bio: z.string().optional(),
        portfolio: z.string().url('Portfolio must be a valid URL').optional().or(z.literal('')),
    }),
]);

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

// ============ Client-Side Form Schemas ============

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

// Base registration schema
const baseRegisterSchema = z.object({
  accountType: z.enum(['PROSPECT', 'COACH'], {
    required_error: 'Please select an account type',
  }),
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  termsAccepted: z
    .boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  // Prospect fields
  ageRange: z.string().optional(),
  heightCm: z.string().optional(),
  weightKg: z.string().optional(),
  goals: z.string().optional(),
  // Coach fields
  discipline: z.string().optional(),
  bio: z.string().optional(),
  portfolio: z.string().optional(),
});

export const registerSchema = baseRegisterSchema
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.accountType === 'COACH') {
        return !!data.discipline && data.discipline.length >= 2;
      }
      return true;
    },
    {
      message: 'Discipline is required for coach accounts',
      path: ['discipline'],
    }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ============ Profile Schemas ============

export const UpdateProfileRequestSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    ageRange: z.string().optional(),
    heightCm: z.coerce.number().positive('Height must be positive').optional(),
    weightKg: z.coerce.number().positive('Weight must be positive').optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;

export const CoachProfileRequestSchema = z.object({
    bio: z.string().optional(),
    discipline: z.string().min(2, 'Discipline is required'),
    portfolio: z.string().optional(),
});

export type CoachProfileRequest = z.infer<typeof CoachProfileRequestSchema>;

// ============ Coach Onboarding Schemas ============

export const CoachOnboardingSchema = z.object({
    bio: z.string().optional(),
    discipline: z.string().min(2, 'Discipline is required'),
    portfolio: z.string().optional(),
});

export type CoachOnboarding = z.infer<typeof CoachOnboardingSchema>;

// ============ Chat Schemas ============

export const InitiateChatRequestSchema = z.object({
    coachId: z.number().int().positive('Valid coach ID required'),
});

export type InitiateChatRequest = z.infer<typeof InitiateChatRequestSchema>;

export const CreateChatRequestSchema = z.object({
    coachId: z.number().int().positive('Valid coach ID required'),
    clientId: z.number().int().positive('Valid client ID required'),
});

export type CreateChatRequest = z.infer<typeof CreateChatRequestSchema>;

export const SendMessageRequestSchema = z.object({
    chatId: z.number().int().positive('Valid chat ID required'),
    content: z.string()
        .min(1, 'Message cannot be empty')
        .max(5000, 'Message cannot exceed 5000 characters'),
});

export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

// ============ Media/Upload Schemas ============

export const PresignedUrlRequestSchema = z.object({
    fileName: z.string().min(1, 'File name is required'),
    mimeType: z.string().min(1, 'MIME type is required'),
    fileSize: z.number().int().positive('File size must be positive').max(52428800, 'File cannot exceed 50MB'),
});

export type PresignedUrlRequest = z.infer<typeof PresignedUrlRequestSchema>;

// ============ Admin Schemas ============

export const ApproveCoachRequestSchema = z.object({
    coachId: z.number().int().positive('Valid coach ID required'),
});

export type ApproveCoachRequest = z.infer<typeof ApproveCoachRequestSchema>;

export const RejectCoachRequestSchema = z.object({
    coachId: z.number().int().positive('Valid coach ID required'),
    reason: z.string().min(5, 'Rejection reason must be at least 5 characters').optional(),
});

export type RejectCoachRequest = z.infer<typeof RejectCoachRequestSchema>;

// ============ Helper Function ============

/**
 * Safely parse and validate request data against a Zod schema.
 * Returns parsed data or null with error logging.
 */
export async function parseRequestBody<T>(
    req: Request,
    schema: z.ZodSchema<T>,
): Promise<{ data?: T; error?: { code: string; message: string } }> {
    try {
        const body = await req.json();
        const result = schema.safeParse(body);

        if (!result.success) {
            const firstError = result.error.errors[0];
            return {
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `${firstError.path.join('.')}: ${firstError.message}`,
                },
            };
        }

        return { data: result.data };
    } catch (err) {
        console.error('[parseRequestBody]', err);
        return {
            error: {
                code: 'INVALID_JSON',
                message: 'Request body must be valid JSON',
            },
        };
    }
}
