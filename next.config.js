const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development",
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Remove the output: 'export' setting
    reactStrictMode: true,
    images: {
        domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com"],
        // Remove unoptimized: true as we're not doing static export
    },
}

module.exports = withPWA(nextConfig)

