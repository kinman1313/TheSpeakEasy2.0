// app/page.tsx
import type { Metadata } from 'next';
import { AuthenticatedApp } from '@/components/AuthenticatedApp';

// SEO/metadata for the root page
export const metadata: Metadata = {
  title: 'SpeakEasy',
  description: 'Real‑time chat application',
};

export default function Page() {
  // Render the authenticated application, which internally handles routing to lobby or rooms
  return <AuthenticatedApp />;
}
