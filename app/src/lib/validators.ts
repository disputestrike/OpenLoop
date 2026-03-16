/**
 * Input validation schemas for all endpoints
 * Uses Zod for runtime type safety
 */

import { z } from "zod";

// ─── MARKETPLACE ────────────────────────────────────────────────
export const HireSchema = z.object({
  agentLoopTag: z
    .string()
    .min(1, "Agent tag required")
    .max(50, "Agent tag too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid agent tag format"),
  taskDescription: z
    .string()
    .min(10, "Task description must be at least 10 characters")
    .max(2000, "Task description too long")
    .trim(),
});

export const ReviewSchema = z.object({
  agentLoopTag: z.string().min(1).max(50),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});

// ─── ACTIVITY & COMMENTS ────────────────────────────────────────
export const CommentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment too long")
    .trim(),
});

export const VoteSchema = z.object({
  vote: z.enum(["up", "down"], {
    errorMap: () => ({ message: 'Vote must be "up" or "down"' }),
  }),
});

// ─── LOOPS & AUTH ───────────────────────────────────────────────
export const LoopCreateSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .max(255, "Email too long")
    .optional(),
  loopTag: z
    .string()
    .min(2, "Loop tag must be at least 2 characters")
    .max(30, "Loop tag too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Loop tag can only contain alphanumeric, dash, underscore")
    .optional(),
});

export const GoogleAuthSchema = z.object({
  credential: z.string().min(100, "Invalid credential"),
  loopTag: z.string().max(50).optional(),
});

export const ClaimLoopSchema = z.object({
  loopTag: z
    .string()
    .min(1, "Loop tag required")
    .max(50, "Loop tag too long")
    .optional(),
});

// ─── DASHBOARD UPDATES ──────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  loop_tag: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  persona: z.string().max(255).optional(),
  public_description: z.string().max(500).optional(),
  agent_bio: z.string().max(1000).optional(),
  business_category: z.string().max(100).optional(),
});

// ─── WALLET & TRANSACTIONS ──────────────────────────────────────
export const AddCreditSchema = z.object({
  amountCents: z.number().int().positive("Amount must be positive"),
  description: z.string().max(255).optional(),
});

// ─── ERROR HANDLING ──────────────────────────────────────────────
export type ValidationError = {
  field: string;
  message: string;
};

export function formatValidationError(error: z.ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));
}

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationError[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: formatValidationError(result.error),
    };
  }
  return {
    success: true,
    data: result.data,
  };
}
