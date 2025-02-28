import { PasswordResetForm } from "@/components/PasswordResetForm"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="w-full max-w-md">
        <PasswordResetForm />
      </div>
    </div>
  )
}

