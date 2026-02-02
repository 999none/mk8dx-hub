import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

// Force production URL - MUST match NEXTAUTH_URL env var
const PRODUCTION_URL = 'https://nextauth-discord.preview.emergentagent.com';

const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
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
      console.log('[NextAuth] Redirect:', { url, baseUrl, forced: PRODUCTION_URL });
      
      // Always use production URL
      if (url.startsWith('/')) return `${PRODUCTION_URL}${url}`;
      if (url.startsWith(PRODUCTION_URL)) return url;
      return PRODUCTION_URL;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };