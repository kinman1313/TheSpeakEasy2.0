import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="mb-6">Could not find the requested resource</p>
      <Link
  href="/"
  className="btn-primary px-4 py-2 rounded-md transition-colors"
>
  Return Home
</Link>
    </div>
  )
}

