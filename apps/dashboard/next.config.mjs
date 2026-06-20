/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @hoixi/db (Prisma) workspace paketini transpile et.
  transpilePackages: ["@hoixi/db"],
  // Prisma'yı server externals'ta tut.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "files.kick.com" },
    ],
  },
};

export default nextConfig;
