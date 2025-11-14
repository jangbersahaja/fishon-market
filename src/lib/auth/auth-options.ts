import { validateTac } from "@/lib/auth/tac";
import { prisma } from "@/lib/database/prisma";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token.market`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Allow linking OAuth to existing email
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) return null;

        // TAC-first: if a valid TAC code is provided, accept regardless of stored password
        if (await validateTac(email, credentials.password)) {
          // Successfully authenticated by TAC code
        } else if (user.passwordHash) {
          // Check password hash if it exists
          const ok = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          if (!ok) return null;
        } else {
          // OAuth user trying to login with credentials (no password set)
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // On OAuth sign-in, upgrade GUEST users to ANGLER
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            select: { id: true, role: true },
          });

          if (existingUser?.role === "GUEST") {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                role: "ANGLER",
                name: user.name || undefined,
                image: user.image || undefined,
                emailVerified: new Date(), // OAuth = email verified
              },
            });
            console.log(
              `✅ Upgraded GUEST user to ANGLER via OAuth: ${user.email}`
            );
          }
        } catch (error) {
          console.error("Error upgrading guest user on OAuth:", error);
          // Don't block sign-in if upgrade fails
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect back to the page user was on (callbackUrl)
      // If url starts with baseUrl, it's a relative redirect - use it
      if (url.startsWith(baseUrl)) return url;

      // If url starts with "/", prepend baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // If url is an absolute URL with same origin, use it
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}

      // Fallback: return to the referring page (stays on current page)
      return url;
    },
    async jwt({ token, user, trigger }) {
      // On initial sign-in or when user object is available
      if (user) {
        token.id = user.id;
        // Fetch role from database for all users
        if (user.email) {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { email: user.email.toLowerCase() },
              select: { id: true, role: true },
            });
            if (dbUser) {
              token.id = dbUser.id;
              (token as any).role = dbUser.role;
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
          }
        }
      }

      // Refresh role on update trigger
      if (trigger === "update" && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: String(token.email).toLowerCase() },
            select: { role: true },
          });
          if (dbUser) {
            (token as any).role = dbUser.role;
          }
        } catch (error) {
          console.error("Error refreshing user role:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string | undefined;
        (session.user as any).role = (token as any).role as string | undefined;
      }
      return session;
    },
  },
};
