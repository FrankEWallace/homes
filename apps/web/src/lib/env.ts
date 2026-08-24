import { z } from "zod";

/**
 * Typed environment for the web app. The web talks only to the backend API
 * (the Path A data-access seam) — no direct database or provider access.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Backend base URL used by server components / route handlers.
  API_BASE_URL: z.string().url().default("http://localhost:4000/api/v1"),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export const env = serverSchema.parse(process.env);
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
