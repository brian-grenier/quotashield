import "server-only";

import type { Db } from "mongodb";

export async function ensureIndexes(db: Db) {
  // api_keys
  await db.collection("api_keys").createIndex({ keyHash: 1 }, { unique: true, name: "keyHash_unique" });
  await db
    .collection("api_keys")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "userId_createdAt_desc" });

  // audit_logs
  await db
    .collection("audit_logs")
    .createIndex({ userId: 1, createdAt: -1 }, { name: "userId_createdAt_desc" });
}


