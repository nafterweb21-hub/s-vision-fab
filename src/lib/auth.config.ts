import type { NextAuthConfig } from "next-auth";
import { getPermissionsForRole, getUserAuthState } from "@/lib/permissions";

// Shared NextAuth config used by both `src/proxy.ts` and `src/lib/auth.ts`.
// Next.js 16 runs Proxy on the Node.js runtime, so the DB-backed permission
// lookup below is safe here. The full config in auth.ts adds the Credentials
// provider.
//
// The JWT carries identity only (id, role, employeeId). Permissions are read
// from the database in the session callback so that editing a role takes
// effect immediately instead of on the user's next sign-in.
export const authConfig = {
  session: { strategy: "jwt" },
  logger: {
    error(error: any) {
      const msg = error?.message || String(error) || "";
      const name = error?.name || error?.type || "";
      if (
        name === "JWTSessionError" ||
        msg.includes("JWTSessionError") ||
        msg.includes("decryption secret") ||
        msg.includes("JWEInvalid")
      ) {
        return;
      }
      console.error(error);
    },
  },

  // The app runs behind an nginx reverse proxy; without this Auth.js rejects every request
  // with UntrustedHost unless AUTH_TRUST_HOST happens to be set in the process environment.
  trustHost: true,
  pages: { signIn: "/" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = (user as { id: string }).id;
          token.role = (user as { role: string }).role;
          token.employeeId = (user as { employeeId: string | null }).employeeId;
        }
        return token;
      } catch (error) {
        console.error("AUTH_JWT_ERROR", error);
        throw error;
      }
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          const userId = token.id as string;
          const { role, isActive } = await getUserAuthState(userId);

          session.user.id = userId;
          session.user.employeeId = token.employeeId as string | null;

          // A deactivated or deleted user keeps a valid token until it expires,
          // so strip their authority rather than trusting the token's claims.
          session.user.role = isActive && role ? role : "";
          session.user.permissions = isActive
            ? await getPermissionsForRole(role)
            : {};
        }
        return session;
      } catch (error) {
        console.error("AUTH_SESSION_ERROR", error);
        throw error;
      }
    },
  },
} satisfies NextAuthConfig;
