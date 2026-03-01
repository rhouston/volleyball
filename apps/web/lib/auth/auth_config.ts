import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { Resend } from 'resend';
import { getEnv } from '@/lib/config/env';
import { isPrismaClientReady, prisma } from '@/lib/db/prisma';

const env = getEnv();
const providers: NonNullable<NextAuthOptions['providers']> = [];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

if (env.APPLE_ID && env.APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: env.APPLE_ID,
      clientSecret: env.APPLE_SECRET,
    }),
  );
}

if (env.RESEND_API_KEY && env.EMAIL_FROM) {
  const resend = new Resend(env.RESEND_API_KEY);

  providers.push(
    EmailProvider({
      from: env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        await resend.emails.send({
          from: provider.from ?? env.EMAIL_FROM!,
          to: identifier,
          subject: 'Sign in to Volleyball Season Manager',
          html: `<p>Use this secure sign-in link: <a href="${url}">${url}</a></p>`,
          text: `Use this secure sign-in link: ${url}`,
        });
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  providers,
  session: {
    strategy: 'jwt',
  },
};

if (isPrismaClientReady) {
  authOptions.adapter = PrismaAdapter(prisma as Parameters<typeof PrismaAdapter>[0]);
}
