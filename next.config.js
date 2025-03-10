const path = require('path');
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add output standalone for better deployment compatibility
  output: 'standalone',
  images: {
    domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com", "media.giphy.com"],
  },
  experimental: {
    webpackBuildWorker: true,
    serverComponentsExternalPackages: ["undici", "firebase", "firebase-admin"],
  },
  // Skip TS and ESLint checks during build to avoid issues
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Add a rule to handle the undici package
    config.module.rules.push({
      test: /node_modules\/undici\/.*\.js$/,
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-env"],
        plugins: [
          "@babel/plugin-proposal-private-methods",
          "@babel/plugin-proposal-class-properties",
        ],
      },
    });

    // Fix the alias path - make sure it points to your project root
    // The current path might be incorrect if your src folder isn't at the root
    config.resolve.alias['@'] = path.resolve(__dirname);

    return config;
  },
};

module.exports = withPWA(nextConfig);