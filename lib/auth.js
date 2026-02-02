import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';

const PRODUCTION_URL = process.env.NEXTAUTH_URL || 'https://discord-redirect-1.preview.emergentagent.com';
const SERVER_ID = process.env.DISCORD_LOUNGE_SERVER_ID;

const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify email guilds guilds.members.read',
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
        
        // Vérifier si l'utilisateur est dans le serveur cible
        try {
          const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${account.access_token}` },
          });
          const guilds = await guildsRes.json();
          token.isInServer = Array.isArray(guilds) && guilds.some(g => g.id === SERVER_ID);
          
          if (token.isInServer) {
            // Récupérer le nickname du serveur
            const memberRes = await fetch(
              `https://discord.com/api/users/@me/guilds/${SERVER_ID}/member`,
              { headers: { Authorization: `Bearer ${account.access_token}` } }
            );
            const memberData = await memberRes.json();
            token.serverNickname = memberData.nick || profile?.username;
          } else {
            token.serverNickname = null;
          }
        } catch (error) {
          console.error('[NextAuth] Error fetching Discord data:', error);
          token.isInServer = false;
          token.serverNickname = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.discordId = token.discordId;
      session.user.avatar = token.avatar;
      session.user.username = token.username;
      session.user.serverNickname = token.serverNickname;
      session.user.isInServer = token.isInServer;
      session.accessToken = token.accessToken;
      return session;
    },
    async redirect({ url }) {
      if (url.startsWith('/')) return `${PRODUCTION_URL}${url}`;
      if (url.startsWith(PRODUCTION_URL)) return url;
      return PRODUCTION_URL;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST, authOptions };