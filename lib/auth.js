import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

// Force production URL
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'https://lounge-stats.preview.emergentagent.com';

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          redirect_uri: `${NEXTAUTH_URL}/api/auth/callback/discord`,
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // Force the base URL
  basePath: '/api/auth',
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.discordId = profile?.id;
        token.avatar = profile?.avatar;
        token.username = profile?.username;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId;
      session.user.avatar = token.avatar;
      session.user.username = token.username;
      session.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always use NEXTAUTH_URL
      const actualBaseUrl = NEXTAUTH_URL;
      
      console.log('[NextAuth] Redirect called:', { url, baseUrl, actualBaseUrl });
      
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${actualBaseUrl}${url}`;
      // Allow callback URLs that are on the same origin
      if (url.includes(actualBaseUrl)) return url;
      // Otherwise, default to home
      return actualBaseUrl;
    },
  },
});

export { handler as GET, handler as POST };