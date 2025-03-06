const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com", "media.giphy.com"],
  },
  experimental: {
    webpackBuildWorker: true,
    serverComponentsExternalPackages: ["undici", "firebase", "firebase-admin"],
  },
  webpack: (config, { isServer, dev }) => {
    // Add a rule to handle the undici package
    config.module.rules.push({
      test: /node_modules\/undici\/.*\.js$/,
      loader: "babel-loader",
      options: {
        presets: ["@babel/preset-env"],
        plugins: ["@babel/plugin-proposal-private-methods", "@babel/plugin-proposal-class-properties"],
      },
    })

    return config
  },
}

module.exports = withPWA(nextConfig)

