"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./dashboard.module.css";

type ApiKeyPublic = {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
};

type KeysResponse = {
  keys: ApiKeyPublic[];
};

type UsageResponse = {
  today: number;
  month: number;
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function DashboardClient() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [usage, setUsage] = useState<UsageResponse>({ today: 0, month: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [rawKeyOnce, setRawKeyOnce] = useState<string | null>(null);

  const activeCount = useMemo(() => keys.filter((k) => k.status === "active").length, [keys]);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [keysRes, usageRes] = await Promise.all([
        fetch("/api/keys", { cache: "no-store" }),
        fetch("/api/usage", { cache: "no-store" }),
      ]);

      if (!keysRes.ok) throw new Error(`Failed to load keys (${keysRes.status})`);
      if (!usageRes.ok) throw new Error(`Failed to load usage (${usageRes.status})`);

      const keysJson = (await keysRes.json()) as KeysResponse;
      const usageJson = (await usageRes.json()) as UsageResponse;

      setKeys(keysJson.keys ?? []);
      setUsage({ today: usageJson.today ?? 0, month: usageJson.month ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function onCreate() {
    setCreating(true);
    setError(null);
    setRawKeyOnce(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const json = (await res.json()) as unknown;
      if (!res.ok) {
        throw new Error(`Create failed (${res.status})`);
      }

      const data = json as { rawKey?: string };
      if (!data.rawKey) throw new Error("Create succeeded but rawKey was missing");

      setRawKeyOnce(data.rawKey);
      setNewName("");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    const ok = confirm("Revoke this key? It will stop working immediately.");
    if (!ok) return;

    setRevokingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Revoke failed (${res.status})`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Usage</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <div className={styles.cardLabel}>Today</div>
            <div className={styles.cardValue}>{usage.today}</div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardLabel}>This month</div>
            <div className={styles.cardValue}>{usage.month}</div>
          </div>
        </div>
        <p className={styles.muted}>Counts sum across your {activeCount} active key(s).</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>API Keys</h2>

        {rawKeyOnce ? (
          <div className={styles.banner}>
            <div className={styles.bannerTitle}>New API key (copy now)</div>
            <div className={styles.bannerText}>
              Copy this now. You won’t be able to see it again.
            </div>
            <code className={styles.rawKey}>{rawKeyOnce}</code>
            <button className={styles.button} onClick={() => setRawKeyOnce(null)}>
              I copied it
            </button>
          </div>
        ) : null}

        <div className={styles.formRow}>
          <input
            className={styles.input}
            placeholder="Key name (e.g., 'prod key')"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            className={styles.button}
            onClick={() => void onCreate()}
            disabled={creating || newName.trim().length === 0}
          >
            {creating ? "Creating..." : "Create key"}
          </button>
        </div>

        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : keys.length === 0 ? (
          <p className={styles.muted}>No keys yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Last 4</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td>{k.prefix}</td>
                    <td>{k.last4}</td>
                    <td>{fmtDate(k.createdAt)}</td>
                    <td>{fmtDate(k.lastUsedAt)}</td>
                    <td>
                      <span className={k.status === "active" ? styles.badgeActive : styles.badgeRevoked}>
                        {k.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.buttonSecondary}
                        onClick={() => void onRevoke(k.id)}
                        disabled={k.status !== "active" || revokingId === k.id}
                      >
                        {revokingId === k.id ? "Revoking…" : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

