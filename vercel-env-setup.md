# Vercel Environment Variables Setup

## Required Environment Variables for Production

Add these in your Vercel dashboard (Settings → Environment Variables):

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=thespeakeasy.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=thespeakeasy
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=thespeakeasy.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
```

## Important Notes

- Set environment for: Production, Preview, and Development
- Copy values exactly from your local .env file
- Make sure all variables start with NEXT_PUBLIC_ for client-side access

## Firebase Authorized Domains to Add

- your-app.vercel.app (production)
- your-app-git-main-username.vercel.app (preview)
- localhost:3000 (development)
