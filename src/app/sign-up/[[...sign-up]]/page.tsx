import { SignUp } from "@clerk/nextjs";

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="mx-auto max-w-4xl p-8 text-sm">
        Clerk is not configured. Add <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
        <code>CLERK_SECRET_KEY</code> to <code>.env.local</code>.
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl justify-center p-8">
      <SignUp />
    </main>
  );
}


