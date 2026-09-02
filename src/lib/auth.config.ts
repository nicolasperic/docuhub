import type { NextAuthConfig } from "next-auth";

// This config is used by the middleware (Edge Runtime).
// It does NOT include the Credentials provider (which needs bcrypt/Prisma).
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [], // Providers are added in the full auth.ts
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.organizationId = u.organizationId ?? null;
        token.orgRole = u.orgRole ?? "MEMBER";
        token.organizationSlug = u.organizationSlug ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session.user as any;
        s.organizationId = token.organizationId;
        s.orgRole = token.orgRole;
        s.organizationSlug = token.organizationSlug;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isPublicPath = ["/login", "/register"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");
      // Ingest APIs run their own auth in-handler (bearer token / token-or-session), so
      // they bypass the session-based middleware gate. Note: only /api/documents/ingest
      // is exempt — the rest of /api/documents stays session-protected for the UI.
      const isIngestApi =
        nextUrl.pathname.startsWith("/api/docs") ||
        nextUrl.pathname.startsWith("/api/graph") ||
        nextUrl.pathname.startsWith("/api/documents/ingest");

      if (isPublicPath || isAuthApi || isIngestApi) return true;
      if (!isLoggedIn) return false;

      // Redirect users without an org to setup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user = auth?.user as any;
      if (!user?.organizationId && !nextUrl.pathname.startsWith("/setup")) {
        return Response.redirect(new URL("/setup", nextUrl.origin));
      }

      return true;
    },
  },
};
