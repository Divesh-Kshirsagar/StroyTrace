import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  handle: z.string().regex(/^[a-z0-9_]+$/, "Handle can only contain lowercase letters, numbers, and underscores").min(3, "Min 3 characters").max(30, "Max 30 characters"),
  display_name: z.string().min(1, "Display name is required").max(100)
});
