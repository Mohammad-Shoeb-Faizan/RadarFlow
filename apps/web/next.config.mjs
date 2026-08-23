/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@radarflow/sdk"],
  serverExternalPackages: ["@libsql/client", "better-sqlite3", "bcryptjs"],
};

export default nextConfig;
