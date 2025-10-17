"use client";

import { useEffect, useMemo, useState } from "react";

interface ReminderItem {
  id: number;
  noteId: number;
  type: "RemitPremium" | "VATOnCommission";
  dueDate: string; // YYYY-MM-DD
  status: "Pending" | "Completed" | "Overdue";
  note?: {
    id: number;
    noteId: string;
    noteType: "DN" | "CN";
    clientId: number;
    policyId: number;
    grossPremium: number;
    netAmountDue: number;
    status: string;
  };
  client?: { id: number; companyName: string };
  policy?: { id: number; policyNumber: string };
}

export default function RemindersPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [filter, setFilter] = useState<{ status: string; type: string }>({ status: "Pending,Overdue", type: "" });

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null), []);
  const userId = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("user_id") : null), []);

  const headers = useMemo(() => {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (userId) h["x-user-id"] = userId;
    return h;
  }, [token, userId]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.type) params.set("type", filter.type);
      params.set("limit", "100");
      const res = await fetch(`/api/reminders?${params.toString()}`);
      const json = await res.json();
      setItems(Array.isArray(json) ? json : []);
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.status, filter.type, token, userId]);

  const completeReminder = async (id: number) => {
    const res = await fetch("/api/reminders/\n        [id]/complete".replace("\n        ", "").replace("[id]", String(id)), {
      method: "POST",
      headers,
      body: JSON.stringify({ id })
    });
    if (res.ok) {
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "Completed", completedAt: new Date().toISOString() as any } : it)) as any);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Reminders</h1>

      <div className="rounded-md border border-border p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Status</label>
          <select
            className="w-full border rounded px-2 py-2 bg-background"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="Pending,Overdue">Pending & Overdue</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Type</label>
          <select
            className="w-full border rounded px-2 py-2 bg-background"
            value={filter.type}
            onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">All</option>
            <option value="RemitPremium">Remit Premium</option>
            <option value="VATOnCommission">VAT on Commission</option>
          </select>
        </div>
        <div className="flex items-end">
          <button onClick={load} className="px-3 py-2 rounded bg-secondary text-secondary-foreground border border-border">Refresh</button>
        </div>
      </div>

      <div className="rounded-md border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Upcoming & Due</h2>
          {loading && <div className="text-xs text-muted-foreground">Loading...</div>}
        </div>
        {items.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No reminders.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.type} • {r.note?.noteType} {r.note?.noteId}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.client?.companyName || "Client"} • Policy {r.policy?.policyNumber || r.note?.policyId}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border border-border ${r.status === "Overdue" ? "bg-destructive text-white" : r.status === "Pending" ? "bg-amber-100 text-amber-900" : "bg-secondary text-secondary-foreground"}`}>
                    {r.status}
                  </span>
                  <span className="text-xs text-muted-foreground">Due {r.dueDate}</span>
                  {r.status !== "Completed" && (
                    <button onClick={() => completeReminder(r.id)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Complete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}