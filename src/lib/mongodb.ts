import "server-only";

import { MongoClient } from "mongodb";
import { ensureIndexes } from "./dbIndexes";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  var _mongoIndexesPromise: Promise<void> | undefined;
}

function getDbNameFromUri(uri: string): string | undefined {
  try {
    const url = new URL(uri);
    const pathname = url.pathname?.replace(/^\//, "");
    return pathname || undefined;
  } catch {
    return undefined;
  }
}

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is missing. Add it to .env.local to enable MongoDB.");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }

  const client = await global._mongoClientPromise;
  const dbName = getDbNameFromUri(uri) ?? "quotashield";
  const db = client.db(dbName);

  if (!global._mongoIndexesPromise) {
    global._mongoIndexesPromise = ensureIndexes(db).catch((err) => {
      global._mongoIndexesPromise = undefined;
      throw err;
    });
  }
  await global._mongoIndexesPromise;

  return { client, db };
}


