import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ObjectId } from "mongodb";

import { revokeApiKeyByIdForUser } from "@/models/apiKeys";
import { writeAuditLog } from "@/models/auditLogs";

export async function DELETE(
  _req: Request,
  ctx: {
    params: Promise<{ id: string }>;
  },
) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY." },
      { status: 500 },
    );
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const res = await revokeApiKeyByIdForUser(id, userId);
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await writeAuditLog({
    userId,
    action: "KEY_REVOKED",
    meta: { keyId: id },
  });

  return NextResponse.json({ ok: true });
}


