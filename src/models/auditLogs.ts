import "server-only";

import type { Collection, WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type AuditLogDoc = {
  userId: string;
  action: string;
  meta: Record<string, unknown>;
  createdAt: Date;
};

export type AuditLogDocWithId = WithId<AuditLogDoc>;

export async function auditLogsCollection(): Promise<Collection<AuditLogDoc>> {
  const { db } = await getDb();
  return db.collection<AuditLogDoc>("audit_logs");
}

export async function writeAuditLog(input: {
  userId: string;
  action: string;
  meta?: Record<string, unknown>;
}) {
  const col = await auditLogsCollection();
  return await col.insertOne({
    userId: input.userId,
    action: input.action,
    meta: input.meta ?? {},
    createdAt: new Date(),
  });
}


