"use client";

import { useEffect, useMemo, useState } from "react";

interface Client { id: number; companyName: string }
interface Lob { id: number; name: string }
interface RfqListItem {
  id: number;
  description: string;
  status: string;
  client?: { id: number; companyName: string };
  primaryLob?: { id: number; name: string };
  createdAt?: string;
}

export default function RFQsPage() {
  const [authed, setAuthed] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [lobs, setLobs] = useState<Lob[]>([]);
  const [rfqs, setRfqs] = useState<RfqListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientId: "",
    primaryLobId: "",
    description: "",
    expectedSumInsured: "",
    expectedGrossPremium: "",
    currency: "NGN",
    targetRatePct: "",
  });
  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null), []);
  const userId = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("user_id") : null), []);

  useEffect(() => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (userId) headers["x-user-id"] = userId;

    const load = async () => {
      try {
        const [clientsRes, lobsRes, rfqsRes] = await Promise.all([
          fetch(`/api/clients?limit=100`, { headers }),
          fetch(`/api/lobs?limit=100`, { headers }),
          fetch(`/api/rfqs?limit=50`, { headers }),
        ]);
        const [clientsJson, lobsJson, rfqsJson] = await Promise.all([
          clientsRes.json(),
          lobsRes.json(),
          rfqsRes.json(),
        ]);
        setClients(Array.isArray(clientsJson) ? clientsJson : []);
        setLobs(Array.isArray(lobsJson) ? lobsJson : []);
        setRfqs(Array.isArray(rfqsJson) ? rfqsJson : []);
      } catch (e) {
        // ignore for now
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.primaryLobId || !form.description || !form.expectedSumInsured || !form.expectedGrossPremium) return;
    setSubmitting(true);
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (userId) headers["x-user-id"] = userId;

    try {
      const res = await fetch("/api/rfqs", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: Number(form.clientId),
          primaryLobId: Number(form.primaryLobId),
          description: form.description,
          expectedSumInsured: Number(form.expectedSumInsured),
          expectedGrossPremium: Number(form.expectedGrossPremium),
          currency: form.currency,
          targetRatePct: form.targetRatePct ? Number(form.targetRatePct) : undefined,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setRfqs((prev) => [created, ...prev]);
        setForm({ clientId: "", primaryLobId: "", description: "", expectedSumInsured: "", expectedGrossPremium: "", currency: "NGN", targetRatePct: "" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">RFQs</h1>

      <div className="rounded-md border border-border p-4 mb-6">
        <h2 className="font-medium mb-3">Create RFQ</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select className="border rounded px-2 py-2 bg-background" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
          <select className="border rounded px-2 py-2 bg-background" value={form.primaryLobId} onChange={(e) => setForm({ ...form, primaryLobId: e.target.value })} required>
            <option value="">Select LOB</option>
            {lobs.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <input className="border rounded px-3 py-2 bg-background sm:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <input className="border rounded px-3 py-2 bg-background" type="number" step="0.01" placeholder="Expected Sum Insured" value={form.expectedSumInsured} onChange={(e) => setForm({ ...form, expectedSumInsured: e.target.value })} required />
          <input className="border rounded px-3 py-2 bg-background" type="number" step="0.01" placeholder="Expected Gross Premium" value={form.expectedGrossPremium} onChange={(e) => setForm({ ...form, expectedGrossPremium: e.target.value })} required />
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 bg-background w-28" placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
            <input className="border rounded px-3 py-2 bg-background" type="number" step="0.01" placeholder="Target Rate % (optional)" value={form.targetRatePct} onChange={(e) => setForm({ ...form, targetRatePct: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <button disabled={submitting} className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">{submitting ? "Creating..." : "Create RFQ"}</button>
          </div>
        </form>
      </div>

      <div className="rounded-md border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Recent RFQs</h2>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : rfqs.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No RFQs yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {rfqs.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{r.description}</div>
                  <div className="text-xs text-muted-foreground">{r.client?.companyName || "Client"} • {r.primaryLob?.name || "LOB"}</div>
                </div>
                <div className="text-xs px-2 py-0.5 rounded-full border border-border bg-secondary text-secondary-foreground">{r.status}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}