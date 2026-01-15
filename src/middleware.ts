import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const hasClerkEnv = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY,
);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export default function middleware(req: NextRequest, evt: NextFetchEvent) {
  if (isProtectedRoute(req) && !hasClerkEnv) {
    return new NextResponse(
      "Clerk is not configured. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to .env.local.",
      { status: 500 },
    );
  }

  if (!hasClerkEnv) {
    // Allow non-protected routes to function even if Clerk isn't configured yet.
    return NextResponse.next();
  }

  return withClerk(req, evt);
}

export const config = {
  // Run Clerk middleware on all routes (so components like <SignedIn/> can work everywhere),
  // but only *protect* the routes we choose above.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};


