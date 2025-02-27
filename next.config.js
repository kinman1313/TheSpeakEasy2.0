const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export', // Add this for Firebase hosting
    reactStrictMode: true,
    images: {
        unoptimized: true, // Add this for static export
        domains: ['firebasestorage.googleapis.com', 'lh3.googleusercontent.com'],
    },
}

module.exports = withPWA(nextConfig)