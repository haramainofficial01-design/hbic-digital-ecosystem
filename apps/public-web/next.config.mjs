const nextConfig = {
  transpilePackages: ["@hbic/shared"],
  // Runtime configuration comes from Vercel's encrypted environment variables.
  // Do not trace local development env files into deployed functions.
  outputFileTracingExcludes: {
    "/*": [".env", ".env.*"]
  },
  outputFileTracingIncludes: {
    "/api/academy/pass/wallet": ["./public/brand/hbic-logo.png"]
  },
  // Social and messaging crawlers need metadata in the initial document head.
  htmlLimitedBots: /.*/
};

export default nextConfig;
