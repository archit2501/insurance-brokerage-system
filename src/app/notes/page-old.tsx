"use client";

import { useEffect, useMemo, useState } from "react";

type NoteType = "DN" | "CN";

interface Client { id: number; companyName: string }
interface Insurer { id: number; companyName: string }
interface Policy { id: number; policyNumber: string }
interface NoteItem {
  id: number;
  noteId: string;
  noteType: NoteType;
  clientId: number;
  insurerId?: number | null;
  policyId: number;
  grossPremium: number;
  brokeragePct: number;
  vatPct: number;
  agentCommissionPct: number;
  netAmountDue: number;
  status: "Draft" | "Approved" | "Issued";
  pdfPath?: string | null;
}

const INSURER_ROLES = [
  "underwriter",
  "marketer",
  "MD",
  "ED",
  "DGM",
  "Head_of_RI",
  "claims",
  "technical",
] as const;

export default function NotesPage() {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [emailingId, setEmailingId] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const token = useMemo(() => (typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null), []);

  const [form, setForm] = useState({
    noteType: "DN" as NoteType,
    clientId: "",
    policyId: "",
    insurerId: "", // required for CN
    grossPremium: "",
    brokeragePct: "",
    vatPct: "7.5",
    agentCommissionPct: "0",
  });

  const [dispatchForm, setDispatchForm] = useState({
    roles: new Set<string>(["underwriter"]), // API requires non-empty array; default safe
    extraEmails: "",
  });

  const headers = useMemo(() => {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (userId) h["x-user-id"] = userId;
    return h;
  }, [token, userId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [clientsRes, insurersRes, policiesRes, notesRes] = await Promise.all([
        fetch(`/api/clients?limit=200`),
        fetch(`/api/insurers?limit=200`),
        fetch(`/api/policies?limit=200`),
        fetch(`/api/notes?limit=50`, { headers }),
      ]);
      const [clientsJson, insurersJson, policiesJson, notesJson] = await Promise.all([
        clientsRes.json(),
        insurersRes.json(),
        policiesRes.json(),
        notesRes.json(),
      ]);
      
      // Map policies response
      const policiesData = Array.isArray(policiesJson) ? policiesJson : [];
      const mappedPolicies = policiesData.map((p: any) => ({
        id: p.id,
        policyNumber: p.policyNumber || `Policy #${p.id}`
      }));
      
      setClients(Array.isArray(clientsJson) ? clientsJson : []);
      setInsurers(Array.isArray(insurersJson) ? insurersJson : []);
      setPolicies(mappedPolicies);
      
      // Map notes response - API returns { note: {...}, client: {...}, insurer: {...}, policy: {...} }
      const notesData = Array.isArray(notesJson) ? notesJson : [];
      const mapped = notesData.map((n: any) => (n.note ? n.note : n));
      setNotes(mapped);
    } catch (_) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserIdAndLoad = async () => {
      // Fetch userId from session
      try {
        const sessionRes = await fetch("/api/auth/get-session", {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          const id = sessionData?.user?.id || sessionData?.session?.userId || null;
          setUserId(id ? String(id) : null);
        }
      } catch (error) {
        console.error('Failed to fetch session:', error);
      }
      
      // Load data regardless of userId (some APIs may work without auth)
      await loadAll();
    };
    
    fetchUserIdAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const createNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.policyId || !form.grossPremium || !form.brokeragePct) return;
    if (form.noteType === "CN" && !form.insurerId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          noteType: form.noteType,
          clientId: Number(form.clientId),
          policyId: Number(form.policyId),
          insurerId: form.noteType === "CN" ? Number(form.insurerId) : undefined,
          grossPremium: Number(form.grossPremium),
          brokeragePct: Number(form.brokeragePct),
          vatPct: Number(form.vatPct || 7.5),
          agentCommissionPct: Number(form.agentCommissionPct || 0),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setNotes((prev) => [created, ...prev]);
        setForm({ noteType: "DN", clientId: "", policyId: "", insurerId: "", grossPremium: "", brokeragePct: "", vatPct: "7.5", agentCommissionPct: "0" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const approveNote = async (n: NoteItem) => {
    // Call dedicated approve endpoint (requires ?id= due to route handler implementation)
    const res = await fetch(`/api/notes/${n.id}/approve?id=${n.id}`, {
      method: "POST",
      headers,
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes((prev) => prev.map((it) => (it.id === n.id ? { ...it, status: updated.status } : it)));
    }
  };

  const issueNote = async (n: NoteItem) => {
    const res = await fetch(`/api/notes/${n.id}/issue`, {
      method: "POST",
      headers,
      body: JSON.stringify({ noteId: n.noteId }),
    });
    if (res.ok) {
      const json = await res.json();
      const updated = json.note || json; // route returns { note, reminders }
      setNotes((prev) => prev.map((it) => (it.noteId === n.noteId ? { ...it, status: updated.status } : it)));
    }
  };

  const emailNote = async (n: NoteItem) => {
    setEmailingId(n.id);
    try {
      const toRoles = Array.from(dispatchForm.roles);
      const toExtraEmails = dispatchForm.extraEmails
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await fetch("/api/dispatch/email", {
        method: "POST",
        headers,
        body: JSON.stringify({
          noteId: n.noteId,
          toRoles: toRoles.length > 0 ? toRoles : ["underwriter"],
          toExtraEmails,
        }),
      });
      if (res.ok) {
        // no-op; could toast success
      }
    } finally {
      setEmailingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold mb-4">Credit/Debit Notes</h1>

      <div className="rounded-md border border-border p-4 mb-6">
        <h2 className="font-medium mb-3">Create Note</h2>
        <form onSubmit={createNote} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <label className="text-sm">Type</label>
            <select
              className="border rounded px-2 py-2 bg-background"
              value={form.noteType}
              onChange={(e) => setForm((f) => ({ ...f, noteType: e.target.value as NoteType }))}
            >
              <option value="DN">Debit Note</option>
              <option value="CN">Credit Note</option>
            </select>
          </div>

          <select
            className="border rounded px-2 py-2 bg-background"
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            required
          >
            <option value="">Select Client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>

          <select
            className="border rounded px-2 py-2 bg-background"
            value={form.policyId}
            onChange={(e) => setForm({ ...form, policyId: e.target.value })}
            required
          >
            <option value="">Select Policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>{p.policyNumber}</option>
            ))}
          </select>

          {form.noteType === "CN" && (
            <select
              className="border rounded px-2 py-2 bg-background"
              value={form.insurerId}
              onChange={(e) => setForm({ ...form, insurerId: e.target.value })}
              required
            >
              <option value="">Select Insurer</option>
              {insurers.map((ins) => (
                <option key={ins.id} value={ins.id}>{ins.companyName}</option>
              ))}
            </select>
          )}

          <input
            className="border rounded px-3 py-2 bg-background"
            type="number"
            step="0.01"
            placeholder="Gross Premium"
            value={form.grossPremium}
            onChange={(e) => setForm({ ...form, grossPremium: e.target.value })}
            required
          />
          <input
            className="border rounded px-3 py-2 bg-background"
            type="number"
            step="0.01"
            placeholder="Brokerage %"
            value={form.brokeragePct}
            onChange={(e) => setForm({ ...form, brokeragePct: e.target.value })}
            required
          />
          <input
            className="border rounded px-3 py-2 bg-background"
            type="number"
            step="0.01"
            placeholder="VAT %"
            value={form.vatPct}
            onChange={(e) => setForm({ ...form, vatPct: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2 bg-background"
            type="number"
            step="0.01"
            placeholder="Agent Commission %"
            value={form.agentCommissionPct}
            onChange={(e) => setForm({ ...form, agentCommissionPct: e.target.value })}
          />

          <div className="sm:col-span-2">
            <button disabled={submitting} className="px-4 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50">
              {submitting ? "Creating..." : "Create Note"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-md border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="font-medium">Recent Notes</h2>
          {loading && <div className="text-xs text-muted-foreground">Loading...</div>}
        </div>
        {notes.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No notes yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{n.noteType} {n.noteId}</div>
                  <div className="text-xs text-muted-foreground truncate">Policy {n.policyId} • Gross {n.grossPremium.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full border border-border ${n.status === "Issued" ? "bg-secondary" : n.status === "Approved" ? "bg-amber-100 text-amber-900" : "bg-muted"}`}>
                    {n.status}
                  </span>
                  {n.pdfPath ? (
                    <a href={n.pdfPath} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 rounded border border-border">Print</a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No PDF</span>
                  )}
                  <button
                    onClick={() => emailNote(n)}
                    disabled={emailingId === n.id}
                    className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border"
                  >
                    {emailingId === n.id ? "Emailing..." : "Email"}
                  </button>
                  {n.status === "Draft" && (
                    <button onClick={() => approveNote(n)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Approve</button>
                  )}
                  {n.status === "Approved" && (
                    <button onClick={() => issueNote(n)} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Issue</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border p-4 mt-6">
        <h3 className="font-medium mb-2">Email Options</h3>
        <div className="text-xs text-muted-foreground mb-3">For CN, select insurer roles. For DN, primary client contacts will be used; roles list is still required by API (we default to Underwriter).</div>
        <div className="flex flex-wrap gap-3 mb-3">
          {INSURER_ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dispatchForm.roles.has(r)}
                onChange={(e) => {
                  setDispatchForm((prev) => {
                    const next = new Set(prev.roles);
                    if (e.target.checked) next.add(r); else next.delete(r);
                    return { ...prev, roles: next };
                  });
                }}
              />
              {r}
            </label>
          ))}
        </div>
        <input
          className="w-full border rounded px-3 py-2 bg-background"
          placeholder="Extra recipient emails (comma separated)"
          value={dispatchForm.extraEmails}
          onChange={(e) => setDispatchForm((p) => ({ ...p, extraEmails: e.target.value }))}
        />
      </div>
    </div>
  );
}