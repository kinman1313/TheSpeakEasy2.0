const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com"],
  },
  // Add trailing slash to match Firebase hosting behavior
  trailingSlash: true,
}

module.exports = nextConfig

