const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com"],
  },
  // Add trailing slash to match Firebase hosting behavior
  trailingSlash: true,
}

module.exports = withPWA(nextConfig)

