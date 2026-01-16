import "server-only";

import { ObjectId, type Collection, type WithId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type ApiKeyDoc = {
  userId: string;
  name: string;
  keyPrefix: string;
  keyLast4: string;
  keyHash: string;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
};

export type ApiKeyDocWithId = WithId<ApiKeyDoc>;

export async function apiKeysCollection(): Promise<Collection<ApiKeyDoc>> {
  const { db } = await getDb();
  return db.collection<ApiKeyDoc>("api_keys");
}

export async function createApiKeyDoc(
  doc: Omit<ApiKeyDoc, "createdAt" | "revokedAt" | "lastUsedAt"> &
    Partial<Pick<ApiKeyDoc, "createdAt" | "revokedAt" | "lastUsedAt">>,
) {
  const col = await apiKeysCollection();
  const now = new Date();

  return await col.insertOne({
    ...doc,
    createdAt: doc.createdAt ?? now,
    revokedAt: doc.revokedAt ?? null,
    lastUsedAt: doc.lastUsedAt ?? null,
  });
}

export async function listApiKeysByUser(userId: string): Promise<ApiKeyDocWithId[]> {
  const col = await apiKeysCollection();
  return await col.find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function listActiveApiKeysByUser(userId: string): Promise<ApiKeyDocWithId[]> {
  const col = await apiKeysCollection();
  return await col.find({ userId, revokedAt: null }).sort({ createdAt: -1 }).toArray();
}

export async function findApiKeyByIdForUser(id: string, userId: string): Promise<ApiKeyDocWithId | null> {
  const col = await apiKeysCollection();
  return await col.findOne({ _id: new ObjectId(id), userId });
}

export async function revokeApiKeyByIdForUser(id: string, userId: string) {
  const col = await apiKeysCollection();
  return await col.updateOne(
    { _id: new ObjectId(id), userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export async function findActiveByHash(keyHash: string): Promise<ApiKeyDocWithId | null> {
  const col = await apiKeysCollection();
  return await col.findOne({ keyHash, revokedAt: null });
}

export async function touchLastUsedAt(id: string) {
  const col = await apiKeysCollection();
  return await col.updateOne({ _id: new ObjectId(id) }, { $set: { lastUsedAt: new Date() } });
}


