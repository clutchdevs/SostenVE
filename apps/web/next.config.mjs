/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA configuration (manifest, service worker) is added in Block 6.
  //
  // There is deliberately no `eslint` key: Next 16 dropped ESLint from `next build`
  // (the key is now rejected as unrecognized and warns on every boot). The old
  // `eslint.ignoreDuringBuilds` existed so the isolated apps/web build on Vercel would
  // not fail on eslint being a root-only dev dependency — which is now the default
  // behaviour. Linting is covered by `npm run lint` (eslint .) at the root, which CI
  // runs; type-checking still happens here (typescript is a dep of apps/web).
};

export default nextConfig;
