import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <p className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        Backend-ready API key system with usage tracking and rate limiting.
      </p>

      <p className="mt-4 text-base text-gray-700 dark:text-gray-300">
        Create and revoke keys, protect public endpoints, and monitor usage from a simple dashboard.
      </p>

      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
