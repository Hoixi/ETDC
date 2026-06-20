// Auth.js (next-auth v5) — Discord OAuth. JWT stratejisi, access token saklanır.
import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // guilds → kullanıcının yönetici olduğu sunucuları çekmek için.
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (profile?.id) token.discordId = profile.id as string;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.discordId = token.discordId as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
