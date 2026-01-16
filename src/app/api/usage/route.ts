import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getRedis } from "@/lib/redis";
import { listActiveApiKeysByUser } from "@/models/apiKeys";

function dayUTC(now: Date): string {
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}

function monthUTC(now: Date): string {
  return now.toISOString().slice(0, 7); // YYYY-MM
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Clerk is not configured. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY." },
      { status: 500 },
    );
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeKeys = await listActiveApiKeysByUser(userId);
  if (activeKeys.length === 0) return NextResponse.json({ today: 0, month: 0 });

  const now = new Date();
  const d = dayUTC(now);
  const m = monthUTC(now);

  const redis = getRedis();
  const pipe = redis.pipeline();
  for (const k of activeKeys) {
    pipe.get(`usage:day:${k.keyHash}:${d}`);
    pipe.get(`usage:month:${k.keyHash}:${m}`);
  }
  const results = await pipe.exec();

  let today = 0;
  let month = 0;
  for (let i = 0; i < results.length; i += 2) {
    today += toNumber(results[i]);
    month += toNumber(results[i + 1]);
  }

  return NextResponse.json({ today, month });
}

