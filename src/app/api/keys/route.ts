import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { createApiKeyDoc, listApiKeysByUser } from "@/models/apiKeys";
import { writeAuditLog } from "@/models/auditLogs";
import { generateRawApiKey, getKeyLast4, getKeyPrefix, hashApiKey } from "@/lib/apiKeys";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY." },
      { status: 500 },
    );
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const docs = await listApiKeysByUser(userId);
  const keys = docs.map((d) => ({
    id: d._id.toString(),
    name: d.name,
    prefix: d.keyPrefix,
    last4: d.keyLast4,
    createdAt: d.createdAt,
    revokedAt: d.revokedAt,
    lastUsedAt: d.lastUsedAt,
    status: d.revokedAt ? ("revoked" as const) : ("active" as const),
  }));

  return NextResponse.json({ keys });
}

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY." },
      { status: 500 },
    );
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const rawKey = generateRawApiKey();
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = getKeyPrefix(rawKey);
  const keyLast4 = getKeyLast4(rawKey);

  const insert = await createApiKeyDoc({
    userId,
    name: parsed.data.name,
    keyPrefix,
    keyLast4,
    keyHash,
  });

  await writeAuditLog({
    userId,
    action: "KEY_CREATED",
    meta: { keyId: insert.insertedId.toString(), name: parsed.data.name, keyPrefix, keyLast4 },
  });

  return NextResponse.json({
    rawKey, // shown only once (on creation)
    key: {
      id: insert.insertedId.toString(),
      name: parsed.data.name,
      prefix: keyPrefix,
      last4: keyLast4,
      createdAt: new Date(),
      lastUsedAt: null,
      status: "active" as const,
    },
  });
}


