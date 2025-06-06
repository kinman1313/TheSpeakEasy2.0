import { PasswordResetForm } from '@/components/auth/PasswordResetForm'; // Corrected path based on typical auth component location

export default function ResetPasswordPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-md rounded-xl shadow-2xl">
        {/* The PasswordResetForm component includes its own CardHeader with Title and Description,
            so no need to repeat similar text here unless a different page title is desired. */}
        <PasswordResetForm />
      </div>
    </main>
  );
}