import type { auth } from "./auth";

export type Session = typeof auth.$Infer.Session;

export interface UserWithRole {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
}
