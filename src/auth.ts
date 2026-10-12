import "server-only";

import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";

import { authenticateWithBackend } from "@/lib/auth-api.server";
import { signInSchema } from "@/schema/signinSchema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = signInSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });
        if (!parsed.success) return null;

        try {
          return await authenticateWithBackend("/user/signin", parsed.data);
        } catch (error) {
          const failure = new CredentialsSignin();
          failure.code = error instanceof Error ? error.message : String(error);
          throw failure;
        }
      },
    }),
    Google,
    GitHub,
  ],
  session: { strategy: "jwt", maxAge: 5 * 60 },
  callbacks: {
    async signIn({ account, user }) {
      if (account?.provider === "github") {
        if (!account.access_token) return "/signin?error=GitHubAccessTokenMissing";

        try {
          const backendUser = await authenticateWithBackend("/user/signup/github", {
            accessToken: account.access_token,
          });
          Object.assign(user, backendUser);
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return `/signin?error=GitHubBackendError&code=${encodeURIComponent(message)}`;
        }
      }
      if (account?.provider !== "google") return true;
      if (!account.id_token) return "/signin?error=GoogleIdTokenMissing";

      try {
        const backendUser = await authenticateWithBackend("/user/signup/gmail", {
          idToken: account.id_token,
        });
        Object.assign(user, backendUser);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `/signin?error=GoogleBackendError&code=${encodeURIComponent(message)}`;
      }
    },
    jwt({ token, user }) {
      if (user) token.accessToken = user.accessToken;
      return token;
    },
  },
});
