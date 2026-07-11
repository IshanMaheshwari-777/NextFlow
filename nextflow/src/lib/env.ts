import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),
  TRANSLOADIT_AUTH_KEY: z.string().min(1),
  TRANSLOADIT_AUTH_SECRET: z.string().min(1),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validates required env vars on first access and caches the result, so a missing
 * key fails fast with one clear message instead of throwing deep inside whichever
 * API call happens to touch it first.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(i => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid required environment variable(s): ${missing}. Check your .env file against .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
