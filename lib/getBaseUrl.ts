import { env } from "@/lib/env";

export function getBaseUrl() {
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  if (env.NEXT_PUBLIC_BASE_URL) {
    return env.NEXT_PUBLIC_BASE_URL;
  }
  return "http://localhost:3000";
}
