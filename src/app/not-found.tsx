import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-8 shadow-lg">
        <p className="text-5xl font-bold tracking-tight text-blue-600">404</p>
        <h1 className="mt-4 text-2xl font-bold text-blue-900">Page not found</h1>
        <p className="mt-2 text-sm text-blue-600">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white hover:from-cyan-600 hover:to-blue-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
