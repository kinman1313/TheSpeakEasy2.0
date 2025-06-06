declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Firebase Client Config
      NEXT_PUBLIC_FIREBASE_API_KEY: string
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: string
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string
      NEXT_PUBLIC_FIREBASE_APP_ID: string
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string

      // Firebase Admin Config
      FIREBASE_PROJECT_ID: string
      FIREBASE_CLIENT_EMAIL: string
      FIREBASE_PRIVATE_KEY: string

      // Next.js Environment
      NODE_ENV: "development" | "production" | "test"
      NEXT_PUBLIC_VERCEL_URL?: string
      VERCEL_ENV?: "production" | "preview" | "development"

      // Optional: Add any other environment variables your app needs
      // Example:
      // NEXT_PUBLIC_API_URL: string
      // DATABASE_URL: string
    }
  }
}

// This export is needed to make the file a module
export { }

