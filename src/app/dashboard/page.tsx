import { auth } from "@clerk/nextjs/server";

import DashboardClient from "./ui";

export default async function DashboardPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  return <DashboardClient />;
}

