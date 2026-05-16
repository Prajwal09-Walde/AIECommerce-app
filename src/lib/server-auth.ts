import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface JwtPayload {
  id: string;
  role: string;
  name?: string | null;
  email?: string | null;
}

/**
 * Retrieves the decoded JWT payload for Server Actions and Server Components.
 * 
 * @returns JwtPayload if authenticated, null if not.
 */
export async function getJwtPayload(): Promise<JwtPayload | null> {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    return null;
  }

  // NextAuth merges our JWT properties (role, id) into the session.user object 
  // via the callbacks in auth.ts
  return {
    id: session.user.id,
    role: session.user.role,
    name: session.user.name,
    email: session.user.email,
  };
}

/**
 * Ensures the requester is authenticated and has the required role.
 * Throws an error if unauthorized. Ideal for protecting Server Actions.
 * 
 * @param requiredRole (Optional) specific role required, e.g. "ADMIN"
 * @returns JwtPayload
 */
export async function requireAuth(requiredRole?: string): Promise<JwtPayload> {
  const payload = await getJwtPayload();

  if (!payload) {
    throw new Error("Unauthorized: No active session found.");
  }

  if (requiredRole && payload.role !== requiredRole) {
    throw new Error(`Forbidden: Requires ${requiredRole} role.`);
  }

  return payload;
}
