import "server-only";

import { NextResponse } from "next/server";

import { hashApiKey } from "@/lib/apiKeys";
import { findActiveByHash, touchLastUsedAt } from "@/models/apiKeys";
import { writeAuditLog } from "@/models/auditLogs";

function extractApiKey(req: Request): string | null {
  const bearer = req.headers.get("authorization");
  if (bearer) {
    const match = bearer.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) return match[1].trim();
  }

  const headerKey = req.headers.get("x-api-key");
  if (headerKey) return headerKey.trim();

  return null;
}

export async function GET(req: Request) {
  const rawKey = extractApiKey(req);
  if (!rawKey) return NextResponse.json({ error: "Missing API key" }, { status: 401 });

  try {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await findActiveByHash(keyHash);
    if (!apiKey) return NextResponse.json({ error: "Invalid API key" }, { status: 401 });

    await touchLastUsedAt(apiKey._id.toString());

    await writeAuditLog({
      userId: apiKey.userId,
      action: "API_CALL",
      meta: {
        keyId: apiKey._id.toString(),
        path: "/api/public/ping",
        method: "GET",
      },
    });

    return NextResponse.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

