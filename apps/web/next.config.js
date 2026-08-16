/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.transloadit.com" },
      { protocol: "https", hostname: "**.tlcdn.com" },
    ],
  },
  serverExternalPackages: ["@trigger.dev/sdk"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};
module.exports = nextConfig;
