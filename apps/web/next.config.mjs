/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA configuration (manifest, service worker) is added in Block 6.
  // Skip ESLint during `next build` on Vercel: eslint (+ its flat config) is a
  // root-only dev dependency not installed in the isolated apps/web build, and CI
  // already runs lint. Type-checking still runs (typescript is a dep of apps/web).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
