import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const baseAdapter = PrismaAdapter(prisma);

export const authOptions: NextAuthOptions = {
  // Our User row requires a `name`, but NextAuth's own account-creation
  // step (the moment someone brand-new clicks their magic link for the
  // first time) only ever hands the adapter an email. Without this
  // override that insert throws, and the person just gets silently
  // bounced back to "Email me a sign-in link" with no explanation. Fall
  // back to the email's local part so account creation always succeeds
  // — the player (or Eric) can rename it anytime afterward.
  adapter: {
    ...baseAdapter,
    createUser: (data: any) =>
      baseAdapter.createUser!({
        ...data,
        name: data.name && data.name.trim() ? data.name : data.email.split("@")[0],
      }),
  },
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
  },
  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM || "Qweezy <qweezy@yourdomain.com>",
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!resend) {
          // Dev fallback: log the magic link instead of emailing it.
          console.log(`\n[qweezy] Magic link for ${identifier}:\n${url}\n`);
          return;
        }
        const { error } = await resend.emails.send({
          from: process.env.EMAIL_FROM || "Qweezy <qweezy@yourdomain.com>",
          to: identifier,
          subject: "Your sign-in link for Qweezy",
          html: `<p>Tap below to sign in.</p><p><a href="${url}">Sign in to Qweezy</a></p><p>If you didn't request this, ignore this email.</p>`,
        });
        if (error) {
          // Surface this in Vercel's runtime logs so a delivery failure
          // (e.g. an unverified sending domain) is easy to spot, and make
          // sure NextAuth treats it as a failed sign-in instead of a silent
          // success.
          console.error("[qweezy] Resend failed to send sign-in email:", error);
          throw new Error(`Resend error: ${error.message}`);
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        (session.user as any).isAdmin = (user as any).isAdmin;
        (session.user as any).balance = (user as any).balance;
      }
      return session;
    },
  },
};
